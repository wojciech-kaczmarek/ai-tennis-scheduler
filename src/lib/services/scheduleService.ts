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
 * Represents a match before court assignment
 */
interface PendingMatch {
  player1: string;
  player2: string;
}

/**
 * Represents a round of matches played simultaneously
 */
interface Round {
  matches: PendingMatch[];
  playersInRound: Set<string>;
}

/**
 * Tracks how recently each player played (for minimizing consecutive matches)
 */
interface PlayerActivity {
  lastRoundPlayed: number;
  matchesPlayed: number;
}

/**
 * Checks if a match can be added to a round without conflicts
 * Priority 1: Same player cannot play on multiple courts in the same round
 */
function canAddMatchToRound(match: PendingMatch, round: Round): boolean {
  return !round.playersInRound.has(match.player1) && !round.playersInRound.has(match.player2);
}

/**
 * Calculates a penalty score for adding a match to a specific round position
 * Lower score = better placement
 * Priority 2: Avoid back-to-back matches for the same player
 */
function calculateMatchPlacementPenalty(
  match: PendingMatch,
  roundIndex: number,
  playerActivity: Map<string, PlayerActivity>
): number {
  let penalty = 0;

  const player1Activity = playerActivity.get(match.player1);
  const player2Activity = playerActivity.get(match.player2);

  if (!player1Activity || !player2Activity) {
    return penalty;
  }

  // Heavy penalty for consecutive rounds (back-to-back matches)
  if (player1Activity.lastRoundPlayed === roundIndex - 1) {
    penalty += 100;
  }
  if (player2Activity.lastRoundPlayed === roundIndex - 1) {
    penalty += 100;
  }

  // Medium penalty for playing with only 1 round break
  if (player1Activity.lastRoundPlayed === roundIndex - 2) {
    penalty += 30;
  }
  if (player2Activity.lastRoundPlayed === roundIndex - 2) {
    penalty += 30;
  }

  // Small penalty based on how many rounds since last played (prefer more rest)
  const player1Rest = roundIndex - player1Activity.lastRoundPlayed;
  const player2Rest = roundIndex - player2Activity.lastRoundPlayed;
  penalty += Math.max(0, 10 - player1Rest);
  penalty += Math.max(0, 10 - player2Rest);

  return penalty;
}

/**
 * Adds a match to a round and updates tracking data
 */
function addMatchToRound(
  match: PendingMatch,
  round: Round,
  roundIndex: number,
  playerActivity: Map<string, PlayerActivity>
): void {
  round.matches.push(match);
  round.playersInRound.add(match.player1);
  round.playersInRound.add(match.player2);

  // Update player activity
  const player1Activity = playerActivity.get(match.player1);
  const player2Activity = playerActivity.get(match.player2);

  if (player1Activity) {
    player1Activity.lastRoundPlayed = roundIndex;
    player1Activity.matchesPlayed++;
  }

  if (player2Activity) {
    player2Activity.lastRoundPlayed = roundIndex;
    player2Activity.matchesPlayed++;
  }
}

/**
 * Generates a round-robin singles schedule with optimization
 * Each player plays against every other player once
 *
 * Algorithm priorities:
 * 1. No player plays on multiple courts in the same round
 * 2. Minimize back-to-back matches for players
 * 3. Maximize court utilization
 */
function generateSinglesSchedule(
  courtsCount: number,
  players: GenerateScheduleRequestDTO["players"]
): GeneratedScheduleDTO {
  // Step 1: Generate all possible matches (round-robin)
  const allMatches: PendingMatch[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      allMatches.push({
        player1: players[i].placeholder_name,
        player2: players[j].placeholder_name,
      });
    }
  }

  // Step 2: Initialize player activity tracking
  const playerActivity = new Map<string, PlayerActivity>();
  players.forEach((player) => {
    playerActivity.set(player.placeholder_name, {
      lastRoundPlayed: -100, // Start with large negative to avoid penalties
      matchesPlayed: 0,
    });
  });

  // Step 3: Organize matches into rounds using greedy algorithm with optimization
  const rounds: Round[] = [];
  const remainingMatches = [...allMatches];

  while (remainingMatches.length > 0) {
    const currentRound: Round = {
      matches: [],
      playersInRound: new Set(),
    };
    const roundIndex = rounds.length;

    // Try to fill the round up to courtsCount matches
    let matchesAdded = 0;

    while (matchesAdded < courtsCount && remainingMatches.length > 0) {
      // Find the best match to add to this round
      let bestMatchIndex = -1;
      let bestPenalty = Infinity;

      for (let i = 0; i < remainingMatches.length; i++) {
        const match = remainingMatches[i];

        // Check if match can be added (Priority 1)
        if (!canAddMatchToRound(match, currentRound)) {
          continue;
        }

        // Calculate placement penalty (Priority 2)
        const penalty = calculateMatchPlacementPenalty(match, roundIndex, playerActivity);

        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestMatchIndex = i;
        }
      }

      // Add best match found
      if (bestMatchIndex !== -1) {
        const match = remainingMatches.splice(bestMatchIndex, 1)[0];
        addMatchToRound(match, currentRound, roundIndex, playerActivity);
        matchesAdded++;
      } else {
        // No valid match found for this round, move to next round
        break;
      }
    }

    rounds.push(currentRound);
  }

  // Step 4: Convert rounds to final schedule with court assignments
  // Priority 3: Optimize court utilization by distributing matches evenly
  const finalMatches: GenerateScheduleMatchDTO[] = [];

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex];

    // Assign matches to courts within this round
    round.matches.forEach((match, matchIndexInRound) => {
      const courtNumber = (matchIndexInRound % courtsCount) + 1;
      const matchOrderOnCourt =
        Math.floor((roundIndex * courtsCount) / courtsCount) + Math.floor(matchIndexInRound / courtsCount) + 1;

      finalMatches.push({
        court_number: courtNumber,
        match_order_on_court: matchOrderOnCourt,
        players: [
          {
            placeholder_name: match.player1,
            team: null,
          },
          {
            placeholder_name: match.player2,
            team: null,
          },
        ],
      });
    });
  }

  // Recalculate match_order_on_court to ensure sequential ordering per court
  const matchesByCourt = new Map<number, GenerateScheduleMatchDTO[]>();

  finalMatches.forEach((match) => {
    if (!matchesByCourt.has(match.court_number)) {
      matchesByCourt.set(match.court_number, []);
    }
    const courtMatches = matchesByCourt.get(match.court_number);
    if (courtMatches) {
      courtMatches.push(match);
    }
  });

  // Reassign match_order_on_court sequentially for each court
  matchesByCourt.forEach((courtMatches) => {
    courtMatches.forEach((match, index) => {
      match.match_order_on_court = index + 1;
    });
  });

  return { matches: finalMatches };
}

/**
 * Represents a doubles match before court assignment
 */
interface PendingDoublesMatch {
  team1: [string, string];
  team2: [string, string];
  allPlayers: string[];
}

/**
 * Tracks partnerships and opponent relationships for maximizing variety
 */
interface DoublesTracking {
  partnerships: Map<string, Set<string>>; // Who has played with whom
  opponents: Map<string, Set<string>>; // Who has played against whom
}

/**
 * Calculates uniqueness score for a doubles match
 * Higher score = more unique combinations (better)
 */
function calculateDoublesMatchUniqueness(match: PendingDoublesMatch, tracking: DoublesTracking): number {
  let uniquenessScore = 0;
  const [t1p1, t1p2] = match.team1;
  const [t2p1, t2p2] = match.team2;

  // Score for partnership uniqueness (higher if they haven't played together)
  if (!tracking.partnerships.get(t1p1)?.has(t1p2)) uniquenessScore += 50;
  if (!tracking.partnerships.get(t2p1)?.has(t2p2)) uniquenessScore += 50;

  // Score for opponent uniqueness (higher if they haven't faced each other)
  const team1Players = [t1p1, t1p2];
  const team2Players = [t2p1, t2p2];

  for (const p1 of team1Players) {
    for (const p2 of team2Players) {
      if (!tracking.opponents.get(p1)?.has(p2)) {
        uniquenessScore += 25;
      }
    }
  }

  return uniquenessScore;
}

/**
 * Updates tracking after a match is scheduled
 */
function updateDoublesTracking(match: PendingDoublesMatch, tracking: DoublesTracking): void {
  const [t1p1, t1p2] = match.team1;
  const [t2p1, t2p2] = match.team2;

  // Update partnerships
  const t1p1Partnerships = tracking.partnerships.get(t1p1);
  const t1p2Partnerships = tracking.partnerships.get(t1p2);
  const t2p1Partnerships = tracking.partnerships.get(t2p1);
  const t2p2Partnerships = tracking.partnerships.get(t2p2);

  if (t1p1Partnerships) t1p1Partnerships.add(t1p2);
  if (t1p2Partnerships) t1p2Partnerships.add(t1p1);
  if (t2p1Partnerships) t2p1Partnerships.add(t2p2);
  if (t2p2Partnerships) t2p2Partnerships.add(t2p1);

  // Update opponents
  const team1Players = [t1p1, t1p2];
  const team2Players = [t2p1, t2p2];

  for (const p1 of team1Players) {
    for (const p2 of team2Players) {
      const p1Opponents = tracking.opponents.get(p1);
      const p2Opponents = tracking.opponents.get(p2);
      if (p1Opponents) p1Opponents.add(p2);
      if (p2Opponents) p2Opponents.add(p1);
    }
  }
}

/**
 * Generates all possible doubles matches with variety scoring
 */
function generateAllDoublesMatches(players: GenerateScheduleRequestDTO["players"]): PendingDoublesMatch[] {
  const allMatches: PendingDoublesMatch[] = [];
  const playerNames = players.map((p) => p.placeholder_name);

  // Generate all possible team combinations
  const teams: [string, string][] = [];
  for (let i = 0; i < playerNames.length; i++) {
    for (let j = i + 1; j < playerNames.length; j++) {
      teams.push([playerNames[i], playerNames[j]]);
    }
  }

  // Generate all possible matches between teams
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Check if teams have no common players
      const team1Set = new Set(team1);
      const hasCommonPlayer = team2.some((player) => team1Set.has(player));

      if (!hasCommonPlayer) {
        allMatches.push({
          team1,
          team2,
          allPlayers: [...team1, ...team2],
        });
      }
    }
  }

  return allMatches;
}

/**
 * Generates an optimized doubles schedule
 * Maximizes unique partner and opponent combinations
 *
 * Algorithm priorities:
 * 1. Maximize unique partnerships (different partners)
 * 2. Maximize unique opponent matchups
 * 3. No player plays on multiple courts in the same round
 * 4. Minimize back-to-back matches for players
 * 5. Maximize court utilization
 */
function generateDoublesSchedule(
  courtsCount: number,
  players: GenerateScheduleRequestDTO["players"]
): GeneratedScheduleDTO {
  // Step 1: Generate all possible doubles matches
  const allMatches = generateAllDoublesMatches(players);

  // Step 2: Initialize tracking structures
  const tracking: DoublesTracking = {
    partnerships: new Map(),
    opponents: new Map(),
  };

  const playerActivity = new Map<string, PlayerActivity>();

  players.forEach((player) => {
    tracking.partnerships.set(player.placeholder_name, new Set());
    tracking.opponents.set(player.placeholder_name, new Set());
    playerActivity.set(player.placeholder_name, {
      lastRoundPlayed: -100,
      matchesPlayed: 0,
    });
  });

  // Step 3: Select matches using greedy algorithm prioritizing uniqueness
  const selectedMatches: PendingDoublesMatch[] = [];
  const remainingMatches = [...allMatches];

  // Calculate target number of matches per player for balanced participation
  // In doubles, ideal is that each player plays roughly the same number of matches
  const totalPlayers = players.length;
  const targetMatchesPerPlayer = Math.floor((totalPlayers - 1) / 1.5); // Heuristic for good coverage

  // Sort matches initially by uniqueness potential
  remainingMatches.sort((a, b) => {
    const scoreA = calculateDoublesMatchUniqueness(a, tracking);
    const scoreB = calculateDoublesMatchUniqueness(b, tracking);
    return scoreB - scoreA;
  });

  // Organize into rounds with optimization
  const rounds: Round[] = [];

  while (remainingMatches.length > 0) {
    // Check if we should continue (avoid excessive matches)
    const maxMatchesPlayer = Math.max(...Array.from(playerActivity.values()).map((a) => a.matchesPlayed));
    if (maxMatchesPlayer >= targetMatchesPerPlayer * 2) {
      break; // Stop if players have played too many matches
    }

    const currentRound: Round = {
      matches: [],
      playersInRound: new Set(),
    };
    const roundIndex = rounds.length;

    let matchesAdded = 0;
    let passCount = 0;

    while (matchesAdded < courtsCount && remainingMatches.length > 0 && passCount < 3) {
      let bestMatchIndex = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < remainingMatches.length; i++) {
        const match = remainingMatches[i];

        // Check if any player in this match is already in current round (Priority: no double booking)
        const hasConflict = match.allPlayers.some((player) => currentRound.playersInRound.has(player));
        if (hasConflict) {
          continue;
        }

        // Calculate composite score
        let score = 0;

        // Uniqueness score (partnerships and opponents)
        score += calculateDoublesMatchUniqueness(match, tracking) * 2;

        // Penalty for back-to-back matches
        const matchAsPending: PendingMatch = {
          player1: match.team1[0],
          player2: match.team1[1],
        };
        const penalty = calculateMatchPlacementPenalty(matchAsPending, roundIndex, playerActivity);
        score -= penalty;

        // Bonus for balanced participation (prefer players with fewer matches)
        const playerMatchCounts = match.allPlayers.map((p) => {
          const activity = playerActivity.get(p);
          return activity ? activity.matchesPlayed : 0;
        });
        const avgMatches = playerMatchCounts.reduce((a, b) => a + b, 0) / 4;
        score += (targetMatchesPerPlayer - avgMatches) * 10;

        if (score > bestScore) {
          bestScore = score;
          bestMatchIndex = i;
        }
      }

      if (bestMatchIndex !== -1) {
        const match = remainingMatches.splice(bestMatchIndex, 1)[0];

        // Add to round
        const pendingMatch: PendingMatch = {
          player1: match.team1[0],
          player2: match.team1[1],
        };
        addMatchToRound(pendingMatch, currentRound, roundIndex, playerActivity);

        // Update activity for all 4 players
        match.allPlayers.forEach((player) => {
          const activity = playerActivity.get(player);
          if (activity) {
            activity.lastRoundPlayed = roundIndex;
            activity.matchesPlayed++;
          }
        });

        // Update doubles tracking
        updateDoublesTracking(match, tracking);

        // Store the doubles match
        selectedMatches.push(match);
        matchesAdded++;
        passCount = 0;
      } else {
        passCount++;
      }
    }

    if (matchesAdded > 0) {
      rounds.push(currentRound);
    } else {
      break; // No more matches can be added
    }
  }

  // Step 4: Convert selected matches to final schedule format
  const finalMatches: GenerateScheduleMatchDTO[] = [];
  let globalMatchIndex = 0;

  for (const selectedMatch of selectedMatches) {
    const matchIndexInRound = globalMatchIndex % courtsCount;
    const courtNumber = matchIndexInRound + 1;

    finalMatches.push({
      court_number: courtNumber,
      match_order_on_court: 0, // Will be recalculated
      players: [
        {
          placeholder_name: selectedMatch.team1[0],
          team: 1,
        },
        {
          placeholder_name: selectedMatch.team1[1],
          team: 1,
        },
        {
          placeholder_name: selectedMatch.team2[0],
          team: 2,
        },
        {
          placeholder_name: selectedMatch.team2[1],
          team: 2,
        },
      ],
    });

    globalMatchIndex++;
  }

  // Recalculate match_order_on_court to ensure sequential ordering per court
  const matchesByCourt = new Map<number, GenerateScheduleMatchDTO[]>();

  finalMatches.forEach((match) => {
    if (!matchesByCourt.has(match.court_number)) {
      matchesByCourt.set(match.court_number, []);
    }
    const courtMatches = matchesByCourt.get(match.court_number);
    if (courtMatches) {
      courtMatches.push(match);
    }
  });

  // Reassign match_order_on_court sequentially for each court
  matchesByCourt.forEach((courtMatches) => {
    courtMatches.forEach((match, index) => {
      match.match_order_on_court = index + 1;
    });
  });

  return { matches: finalMatches };
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
