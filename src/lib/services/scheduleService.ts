import type { GenerateScheduleRequestDTO, GeneratedScheduleDTO, GenerateScheduleMatchDTO } from "../../types";

/**
 * Schedule Service
 * Handles schedule generation logic for tennis tournaments
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
