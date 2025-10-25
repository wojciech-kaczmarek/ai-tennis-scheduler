import type { SupabaseClient } from "../../db/supabase.client";
import type {
  TournamentListItemDTO,
  TournamentListResponseDTO,
  CreateTournamentRequestDTO,
  TournamentCreatedResponseDTO,
  TournamentDetailDTO,
  PlayerDTO,
  MatchDTO,
} from "../../types";
import type { ListTournamentsQuery } from "../schemas/tournamentSchemas";

/**
 * Retrieves a paginated, sorted list of tournaments for a specific user
 *
 * @param supabase - Supabase client instance with user context
 * @param userId - The ID of the authenticated user
 * @param options - Pagination and sorting options
 * @returns Paginated list of tournaments with metadata
 * @throws Error if database query fails
 */
export async function getTournamentsForUser(
  supabase: SupabaseClient,
  userId: string,
  options: ListTournamentsQuery
): Promise<TournamentListResponseDTO> {
  const { page, page_size, sort_by, order } = options;

  // Calculate range for pagination
  const from = (page - 1) * page_size;
  const to = page * page_size - 1;

  // Query tournaments with count
  const { data, count, error } = await supabase
    .from("tournaments")
    .select("id, name, type, players_count, courts, created_at", { count: "exact" })
    .filter("user_id", "eq", userId)
    .order(sort_by, { ascending: order === "asc" })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch tournaments: ${error.message}`);
  }

  // Calculate pagination metadata
  const total_items = count || 0;
  const total_pages = Math.ceil(total_items / page_size);

  // Map database rows to DTOs (fields already match)
  const tournaments: TournamentListItemDTO[] = data || [];

  return {
    data: tournaments,
    pagination: {
      page,
      page_size,
      total_items,
      total_pages,
    },
  };
}

// ============================================================================
// POST /api/tournaments - Create Tournament Functions
// ============================================================================

/**
 * Validates business rules for tournament creation
 * Returns array of error messages (empty if valid)
 *
 * This function performs comprehensive validation beyond schema validation:
 * - Player count rules for singles/doubles
 * - Court number validity
 * - Match slot uniqueness
 * - Player reference integrity
 * - Team assignment rules
 * - Match composition requirements
 *
 * @param data - Tournament creation request data
 * @returns Array of validation error messages (empty if valid)
 */
export function validateTournamentBusinessRules(data: CreateTournamentRequestDTO): string[] {
  const errors: string[] = [];

  // Player count validation
  if (data.type === "singles") {
    if (data.players.length < 2) {
      errors.push("Singles tournaments must have at least 2 players");
    }
    if (data.players.length % 2 !== 0) {
      errors.push("Singles tournaments must have an even number of players");
    }
  }

  if (data.type === "doubles") {
    if (data.players.length < 4) {
      errors.push("Doubles tournaments must have at least 4 players");
    }
    if (data.players.length % 4 !== 0) {
      errors.push("Doubles tournaments must have a player count divisible by 4");
    }
  }

  // Build player set for reference validation
  const playerNames = new Set(data.players.map((p) => p.placeholder_name));

  // Validate placeholder_name uniqueness
  if (playerNames.size !== data.players.length) {
    errors.push("Duplicate placeholder names found in players list");
  }

  // Validate match slots uniqueness
  const matchSlots = new Set<string>();
  for (const match of data.schedule.matches) {
    const slotKey = `${match.court_number}-${match.match_order_on_court}`;
    if (matchSlots.has(slotKey)) {
      errors.push(`Duplicate match slot: court ${match.court_number}, order ${match.match_order_on_court}`);
    }
    matchSlots.add(slotKey);
  }

  // Validate each match
  for (const match of data.schedule.matches) {
    // Court number validation
    if (match.court_number < 1 || match.court_number > data.courts) {
      errors.push(`Invalid court number ${match.court_number}. Must be between 1 and ${data.courts}`);
    }

    // Player count validation
    const expectedPlayerCount = data.type === "singles" ? 2 : 4;
    if (match.players.length !== expectedPlayerCount) {
      errors.push(
        `Match on court ${match.court_number}, order ${match.match_order_on_court} has ${match.players.length} players, expected ${expectedPlayerCount}`
      );
    }

    // Validate player references
    for (const mp of match.players) {
      if (!playerNames.has(mp.placeholder_name)) {
        errors.push(`Player '${mp.placeholder_name}' in match not found in players list`);
      }
    }

    // Team validation
    if (data.type === "singles") {
      const invalidTeams = match.players.filter((p) => p.team !== null);
      if (invalidTeams.length > 0) {
        errors.push(`Singles match on court ${match.court_number} has team assignments (should be null)`);
      }
    }

    if (data.type === "doubles") {
      const teams = match.players.map((p) => p.team);
      const team1Count = teams.filter((t) => t === 1).length;
      const team2Count = teams.filter((t) => t === 2).length;
      const invalidTeams = teams.filter((t) => t !== 1 && t !== 2);

      if (invalidTeams.length > 0) {
        errors.push(`Doubles match on court ${match.court_number} has invalid team values (must be 1 or 2)`);
      }
      if (team1Count !== 2 || team2Count !== 2) {
        errors.push(`Doubles match on court ${match.court_number} must have exactly 2 players per team`);
      }
    }
  }

  // Validate all players are referenced
  const referencedPlayers = new Set<string>();
  for (const match of data.schedule.matches) {
    for (const mp of match.players) {
      referencedPlayers.add(mp.placeholder_name);
    }
  }
  for (const playerName of playerNames) {
    if (!referencedPlayers.has(playerName)) {
      errors.push(`Player '${playerName}' is not referenced in any match`);
    }
  }

  return errors;
}

/**
 * Creates a tournament with players and schedule in a single transaction
 *
 * This function performs a complex multi-table insertion across 5 tables:
 * 1. tournaments - Main tournament record
 * 2. players - All tournament players
 * 3. schedules - Schedule container
 * 4. matches - All match records
 * 5. match_players - Player-to-match associations
 *
 * The operation is designed to be atomic - if any step fails, the entire
 * operation is rolled back by deleting the tournament record (which cascades).
 *
 * @param userId - ID of the authenticated user creating the tournament
 * @param data - Complete tournament creation data
 * @param supabase - Supabase client instance
 * @returns Created tournament summary
 * @throws Error if any database operation fails
 */
export async function createTournamentWithSchedule(
  userId: string,
  data: CreateTournamentRequestDTO,
  supabase: SupabaseClient
): Promise<TournamentCreatedResponseDTO> {
  // Step 1: Insert tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({
      user_id: userId,
      name: data.name,
      type: data.type,
      courts: data.courts,
      players_count: data.players.length,
    })
    .select("id, name, type, players_count, courts, created_at")
    .single();

  if (tournamentError || !tournament) {
    throw new Error(`Failed to create tournament: ${tournamentError?.message}`);
  }

  try {
    // Step 2: Insert players and build mapping
    const { data: players, error: playersError } = await supabase
      .from("players")
      .insert(
        data.players.map((p) => ({
          tournament_id: tournament.id,
          name: p.name,
          placeholder_name: p.placeholder_name,
        }))
      )
      .select("id, placeholder_name");

    if (playersError || !players) {
      throw new Error(`Failed to create players: ${playersError?.message}`);
    }

    // Build placeholder_name → player_id mapping
    const playerMap = new Map<string, string>(players.map((p) => [p.placeholder_name, p.id]));

    // Step 3: Insert schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .insert({
        tournament_id: tournament.id,
      })
      .select("id")
      .single();

    if (scheduleError || !schedule) {
      throw new Error(`Failed to create schedule: ${scheduleError?.message}`);
    }

    // Step 4: Insert matches
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .insert(
        data.schedule.matches.map((m) => ({
          schedule_id: schedule.id,
          court_number: m.court_number,
          match_order_on_court: m.match_order_on_court,
        }))
      )
      .select("id");

    if (matchesError || !matches) {
      throw new Error(`Failed to create matches: ${matchesError?.message}`);
    }

    // Step 5: Insert match-players
    const matchPlayerInserts = data.schedule.matches.flatMap((match, matchIdx) =>
      match.players.map((mp) => {
        const playerId = playerMap.get(mp.placeholder_name);
        if (!playerId) {
          throw new Error(`Player ID not found for placeholder: ${mp.placeholder_name}`);
        }
        return {
          match_id: matches[matchIdx].id,
          player_id: playerId,
          team: mp.team,
        };
      })
    );

    const { error: matchPlayersError } = await supabase.from("match_players").insert(matchPlayerInserts);

    if (matchPlayersError) {
      throw new Error(`Failed to create match players: ${matchPlayersError.message}`);
    }

    // Return created tournament
    return {
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      players_count: tournament.players_count,
      courts: tournament.courts,
      created_at: tournament.created_at,
    };
  } catch (error) {
    // Cleanup: Delete tournament (cascade will remove all related records)
    await supabase.from("tournaments").delete().eq("id", tournament.id);
    throw error;
  }
}

// ============================================================================
// DELETE /api/tournaments/{id} - Delete Tournament Function
// ============================================================================

/**
 * Deletes a tournament and all associated data via cascading delete
 *
 * This function performs a single DELETE operation on the tournaments table.
 * PostgreSQL automatically cascades the deletion to related tables:
 * - schedules (via tournament_id FK)
 * - matches (via schedule_id FK)
 * - match_players (via match_id FK)
 * - players (via tournament_id FK)
 *
 * Row-Level Security (RLS) ensures users can only delete their own tournaments.
 *
 * @param supabase - Supabase client instance with user context
 * @param tournamentId - UUID of the tournament to delete
 * @returns true if tournament was deleted, false if not found or unauthorized
 * @throws Error if database operation fails unexpectedly
 */
export async function deleteTournament(supabase: SupabaseClient, tournamentId: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("tournaments")
    .delete({ count: "exact" })
    .eq("id", tournamentId)
    .select();

  if (error) {
    throw new Error(`Failed to delete tournament: ${error.message}`);
  }

  // count will be 0 if tournament doesn't exist or user doesn't own it (RLS)
  return (count ?? 0) > 0;
}

// ============================================================================
// GET /api/tournaments/{id} - Get Tournament Details Function
// ============================================================================

/**
 * Retrieves complete tournament details including players and schedule
 *
 * This function performs 3 separate optimized queries with minimal data duplication:
 * 1. Tournament + Schedule (1 row) - basic tournament info
 * 2. Players by tournament_id (N rows) - all players once
 * 3. Matches + Match Players (M rows) - matches with player_id references only
 *
 * This approach eliminates all cartesian products and data duplication:
 * - Players are fetched once (not repeated for each match)
 * - Match players reference player_id only (player details mapped from Query 2)
 * - Total rows: 1 + N players + M matches (linear growth)
 *
 * Example for 10 players, 50 matches:
 * - Query 1: 1 row
 * - Query 2: 10 rows
 * - Query 3: 50 rows
 * - Total: 61 rows (vs 75,000 with nested JOINs)
 *
 * Row-Level Security (RLS) ensures users can only access their own tournaments.
 * Returns null if tournament doesn't exist or user doesn't own it.
 *
 * @param supabase - Supabase client instance with user context
 * @param tournamentId - UUID of the tournament to retrieve
 * @returns Complete tournament details or null if not found/unauthorized
 * @throws Error if database query fails unexpectedly
 */
export async function getTournamentById(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<TournamentDetailDTO | null> {
  // Query 1: Fetch tournament with schedule (1 row)
  const { data: tournamentData, error: tournamentError } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      type,
      courts,
      created_at,
      schedules(id)
    `
    )
    .eq("id", tournamentId)
    .single();

  if (tournamentError) {
    // If error code is PGRST116, it means no rows found (could be non-existent or RLS blocked)
    if (tournamentError.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
  }

  if (!tournamentData) {
    return null;
  }

  // Extract schedule (Supabase returns it as an array even though it's one-to-one)
  const schedules = tournamentData.schedules as { id: string }[] | null;
  const schedule = schedules?.[0];
  if (!schedule) {
    return null;
  }

  // Query 2: Fetch all players for this tournament (N rows, no duplication)
  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select("id, name, placeholder_name")
    .eq("tournament_id", tournamentId);

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  // Build player lookup map for fast access by player_id
  const playerMap = new Map<string, PlayerDTO>();
  (playersData || []).forEach((player) => {
    playerMap.set(player.id, {
      id: player.id,
      name: player.name,
      placeholder_name: player.placeholder_name,
    });
  });

  // Query 3: Fetch matches with match_players (only player_id, no JOIN with players table)
  // This avoids duplicating player data for each match
  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
      id,
      court_number,
      match_order_on_court,
      match_players(player_id, team)
    `
    )
    .eq("schedule_id", schedule.id)
    .order("court_number", { ascending: true })
    .order("match_order_on_court", { ascending: true });

  if (matchesError) {
    throw new Error(`Failed to fetch matches: ${matchesError.message}`);
  }

  // Transform matches and map player details from playerMap
  const matches: MatchDTO[] = (matchesData || []).map((match) => ({
    id: match.id,
    court_number: match.court_number,
    match_order_on_court: match.match_order_on_court,
    players: (match.match_players || []).map((mp) => {
      const player = playerMap.get(mp.player_id);
      if (!player) {
        throw new Error(`Player not found for player_id: ${mp.player_id}`);
      }
      return {
        player_id: mp.player_id,
        id: player.id,
        name: player.name,
        placeholder_name: player.placeholder_name,
        team: mp.team,
      };
    }),
  }));

  // Construct final DTO
  const tournamentDetail: TournamentDetailDTO = {
    id: tournamentData.id,
    name: tournamentData.name,
    type: tournamentData.type,
    courts: tournamentData.courts,
    created_at: tournamentData.created_at,
    players: Array.from(playerMap.values()),
    schedule: {
      id: schedule.id,
      matches,
    },
  };

  return tournamentDetail;
}
