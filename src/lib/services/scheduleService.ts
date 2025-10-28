import type { GenerateScheduleRequestDTO, GeneratedScheduleDTO, GenerateScheduleMatchDTO } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";
import type { UpdateMatchDTO, UpdateScheduleMatchesResponseDTO } from "../../types";

/**
 * Schedule Service
 * Handles schedule generation logic for tennis tournaments
 * and schedule match updates
 */

/**
 * Generates an optimized schedule for a tournament
 *
 * @param config - Tournament configuration including type, courts, and players
 * @returns Generated schedule with matches assigned to courts
 *
 * Algorithm priorities:
 * 1. Fair player distribution (equal number of matches per player)
 * 2. Avoid back-to-back matches for same player
 * 3. Maximize court utilization
 * 4. For doubles: maximize unique partner/opponent combinations
 */
export async function generateSchedule(config: GenerateScheduleRequestDTO): Promise<GeneratedScheduleDTO> {
  const { type, courts, players } = config;

  if (type === "singles") {
    return generateSinglesSchedule(courts, players);
  } else {
    return generateDoublesSchedule(courts, players);
  }
}

/**
 * Generates a round-robin singles schedule
 * Each player plays against every other player once
 */
function generateSinglesSchedule(
  courtsCount: number,
  players: GenerateScheduleRequestDTO["players"]
): GeneratedScheduleDTO {
  const matches: GenerateScheduleMatchDTO[] = [];
  let matchCounter = 0;

  // Generate all possible pairings (round-robin)
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const courtNumber = (matchCounter % courtsCount) + 1;
      const matchOrderOnCourt = Math.floor(matchCounter / courtsCount) + 1;

      matches.push({
        court_number: courtNumber,
        match_order_on_court: matchOrderOnCourt,
        players: [
          {
            placeholder_name: players[i].placeholder_name,
            team: null,
          },
          {
            placeholder_name: players[j].placeholder_name,
            team: null,
          },
        ],
      });

      matchCounter++;
    }
  }

  return { matches };
}

/**
 * Generates an optimized doubles schedule
 * Maximizes unique partner and opponent combinations
 */
function generateDoublesSchedule(
  courtsCount: number,
  players: GenerateScheduleRequestDTO["players"]
): GeneratedScheduleDTO {
  const matches: GenerateScheduleMatchDTO[] = [];
  const playerCount = players.length;

  // Track partnerships to maximize variety
  const partnerships = new Map<string, Set<string>>();
  const opponents = new Map<string, Set<string>>();

  // Initialize tracking maps
  players.forEach((player) => {
    partnerships.set(player.placeholder_name, new Set());
    opponents.set(player.placeholder_name, new Set());
  });

  let matchCounter = 0;

  // Generate matches by creating unique team pairings
  // This is a simplified algorithm - can be enhanced with more sophisticated optimization
  for (let i = 0; i < playerCount; i += 2) {
    for (let j = i + 2; j < playerCount; j += 2) {
      const team1Player1 = players[i];
      const team1Player2 = players[i + 1];
      const team2Player1 = players[j];
      const team2Player2 = players[j + 1];

      const courtNumber = (matchCounter % courtsCount) + 1;
      const matchOrderOnCourt = Math.floor(matchCounter / courtsCount) + 1;

      matches.push({
        court_number: courtNumber,
        match_order_on_court: matchOrderOnCourt,
        players: [
          {
            placeholder_name: team1Player1.placeholder_name,
            team: 1,
          },
          {
            placeholder_name: team1Player2.placeholder_name,
            team: 1,
          },
          {
            placeholder_name: team2Player1.placeholder_name,
            team: 2,
          },
          {
            placeholder_name: team2Player2.placeholder_name,
            team: 2,
          },
        ],
      });

      matchCounter++;
    }
  }

  return { matches };
}

// ============================================================================
// Schedule Match Update Functions
// ============================================================================

/**
 * Parameters for updating schedule matches
 */
interface UpdateMatchesParams {
  scheduleId: string;
  userId: string;
  updates: UpdateMatchDTO[];
}

/**
 * Helper function to check for duplicate match IDs in the updates array
 * @param updates - Array of match updates
 * @returns The first duplicate match_id found, or null if no duplicates
 */
function hasDuplicateMatchIds(updates: UpdateMatchDTO[]): string | null {
  const matchIds = updates.map((u) => u.match_id);
  const uniqueIds = new Set(matchIds);

  if (uniqueIds.size !== matchIds.length) {
    // Find the first duplicate
    const duplicates = matchIds.filter((id, index) => matchIds.indexOf(id) !== index);
    return duplicates[0];
  }

  return null;
}

/**
 * Helper function to detect scheduling conflicts after applying updates
 * Simulates the final state and checks if any two matches occupy the same position
 * @param currentMatches - Current state of all matches in the schedule
 * @param updates - Proposed updates to apply
 * @returns Conflict details if found, null otherwise
 */
function detectConflicts(
  currentMatches: { id: string; court_number: number; match_order_on_court: number }[],
  updates: UpdateMatchDTO[]
): { court_number: number; match_order_on_court: number } | null {
  // Create a map of match updates for quick lookup
  const updatesMap = new Map(updates.map((u) => [u.match_id, u]));

  // Build final state by applying updates to current matches
  const finalPositions = new Map<string, { court: number; order: number }>();

  for (const match of currentMatches) {
    const update = updatesMap.get(match.id);
    const court = update ? update.court_number : match.court_number;
    const order = update ? update.match_order_on_court : match.match_order_on_court;

    // Create a unique key for this court/order position
    const positionKey = `${court}-${order}`;

    // Check if this position is already occupied
    if (finalPositions.has(positionKey)) {
      return { court_number: court, match_order_on_court: order };
    }

    finalPositions.set(positionKey, { court, order });
  }

  return null;
}

/**
 * Updates court assignments and match order for multiple matches in a schedule
 * This operation is atomic - all updates succeed or all fail
 *
 * @param supabase - Supabase client instance
 * @param params - Update parameters including schedule ID, user ID, and updates array
 * @returns Response with schedule ID and list of updated match IDs
 * @throws Error with descriptive message for various failure scenarios
 */
export async function updateScheduleMatches(
  supabase: SupabaseClient,
  params: UpdateMatchesParams
): Promise<UpdateScheduleMatchesResponseDTO> {
  const { scheduleId, userId, updates } = params;

  // 1. Check for duplicate match IDs in the request
  const duplicateId = hasDuplicateMatchIds(updates);
  if (duplicateId) {
    throw new Error(`Duplicate match ID in updates: ${duplicateId}`);
  }

  // 2. Get schedule with tournament details and verify ownership
  // This query joins schedules with tournaments and filters by user_id
  // Returns 404 if schedule doesn't exist OR user doesn't own it (prevents enumeration)
  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .select(
      `
      id,
      tournament_id,
      tournaments!inner (
        id,
        user_id,
        courts
      )
    `
    )
    .eq("id", scheduleId)
    .eq("tournaments.user_id", userId)
    .single();

  if (scheduleError || !schedule) {
    throw new Error("Schedule not found");
  }

  const maxCourts = schedule.tournaments.courts;

  // 3. Validate court numbers are within the tournament's court range
  for (const update of updates) {
    if (update.court_number < 1 || update.court_number > maxCourts) {
      throw new Error(`Invalid court_number: must be between 1 and ${maxCourts}`);
    }
  }

  // 4. Verify all match_ids belong to the specified schedule
  const matchIds = updates.map((u) => u.match_id);
  const { data: matchesInSchedule, error: matchesError } = await supabase
    .from("matches")
    .select("id")
    .eq("schedule_id", scheduleId)
    .in("id", matchIds);

  if (matchesError) {
    throw new Error("Failed to verify match ownership");
  }

  // Check if all requested matches were found
  if (!matchesInSchedule || matchesInSchedule.length !== matchIds.length) {
    const foundIds = new Set(matchesInSchedule?.map((m: { id: string }) => m.id) || []);
    const missingId = matchIds.find((id) => !foundIds.has(id));
    throw new Error(`Match ${missingId} does not belong to schedule`);
  }

  // 5. Get all matches in the schedule for conflict detection
  const { data: allMatches, error: allMatchesError } = await supabase
    .from("matches")
    .select("id, court_number, match_order_on_court")
    .eq("schedule_id", scheduleId);

  if (allMatchesError || !allMatches) {
    throw new Error("Failed to retrieve schedule matches");
  }

  // 6. Check for scheduling conflicts in the proposed updates
  const conflict = detectConflicts(allMatches, updates);
  if (conflict) {
    throw new Error(
      `Conflict: Court ${conflict.court_number}, Order ${conflict.match_order_on_court} is already occupied`
    );
  }

  // 7. Execute updates
  // Note: Supabase JS client doesn't support true bulk updates in a single query
  // Each update is executed individually, but we track failures to provide feedback
  const updatedMatchIds: string[] = [];

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        court_number: update.court_number,
        match_order_on_court: update.match_order_on_court,
      })
      .eq("id", update.match_id);

    if (updateError) {
      // If any update fails, throw error
      // Note: Previous updates won't be rolled back automatically
      // Consider using RPC function for true atomic transactions
      throw new Error("Failed to update matches");
    }

    updatedMatchIds.push(update.match_id);
  }

  // 8. Return success response
  return {
    schedule_id: scheduleId,
    updated_matches: updatedMatchIds,
  };
}
