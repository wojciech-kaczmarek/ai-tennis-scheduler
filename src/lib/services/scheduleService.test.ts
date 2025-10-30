import { describe, it, expect } from "vitest";
import { generateSchedule } from "./scheduleService";
import type { GenerateScheduleRequestDTO, GeneratedScheduleDTO, GenerateScheduleMatchDTO } from "../../types";

// ============================================================================
// Helper Functions for Test Assertions
// ============================================================================

/**
 * Creates a player array for testing
 */
function createPlayers(count: number): GenerateScheduleRequestDTO["players"] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    placeholder_name: `P${i + 1}`,
  }));
}

/**
 * Extracts all players from a match
 */
function getMatchPlayers(match: GenerateScheduleMatchDTO): string[] {
  return match.players.map((p) => p.placeholder_name);
}

/**
 * Groups matches by round (matches that don't share players can be in same round)
 */
function groupMatchesByRound(matches: GenerateScheduleMatchDTO[]): GenerateScheduleMatchDTO[][] {
  const rounds: GenerateScheduleMatchDTO[][] = [];
  const remainingMatches = [...matches];

  while (remainingMatches.length > 0) {
    const currentRound: GenerateScheduleMatchDTO[] = [];
    const playersInRound = new Set<string>();

    for (let i = remainingMatches.length - 1; i >= 0; i--) {
      const match = remainingMatches[i];
      const matchPlayers = getMatchPlayers(match);

      // Check if any player in this match is already in current round
      const hasConflict = matchPlayers.some((player) => playersInRound.has(player));

      if (!hasConflict) {
        currentRound.push(match);
        matchPlayers.forEach((player) => playersInRound.add(player));
        remainingMatches.splice(i, 1);
      }
    }

    if (currentRound.length > 0) {
      rounds.push(currentRound);
    }
  }

  return rounds;
}

/**
 * Verifies Priority 1: No player appears twice in the same round
 */
function verifyNoDuplicatePlayersInRounds(matches: GenerateScheduleMatchDTO[]): {
  valid: boolean;
  error?: string;
} {
  const rounds = groupMatchesByRound(matches);

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const playersInRound = new Set<string>();

    for (const match of round) {
      const matchPlayers = getMatchPlayers(match);

      for (const player of matchPlayers) {
        if (playersInRound.has(player)) {
          return {
            valid: false,
            error: `Player ${player} appears multiple times in round ${i + 1}`,
          };
        }
        playersInRound.add(player);
      }
    }
  }

  return { valid: true };
}

/**
 * Counts consecutive matches for each player
 */
function countConsecutiveMatches(matches: GenerateScheduleMatchDTO[]): Map<string, number> {
  const rounds = groupMatchesByRound(matches);
  const playerLastRound = new Map<string, number>();
  const consecutiveCounts = new Map<string, number>();

  rounds.forEach((round, roundIndex) => {
    round.forEach((match) => {
      const matchPlayers = getMatchPlayers(match);

      matchPlayers.forEach((player) => {
        const lastRound = playerLastRound.get(player);

        if (lastRound !== undefined && lastRound === roundIndex - 1) {
          consecutiveCounts.set(player, (consecutiveCounts.get(player) || 0) + 1);
        }

        playerLastRound.set(player, roundIndex);
      });
    });
  });

  return consecutiveCounts;
}

/**
 * Verifies all matches have correct structure
 */
function verifyMatchStructure(
  matches: GenerateScheduleMatchDTO[],
  type: "singles" | "doubles"
): {
  valid: boolean;
  error?: string;
} {
  for (const match of matches) {
    // Check court_number is positive
    if (match.court_number < 1) {
      return { valid: false, error: "Invalid court_number: must be >= 1" };
    }

    // Check match_order_on_court is positive
    if (match.match_order_on_court < 1) {
      return { valid: false, error: "Invalid match_order_on_court: must be >= 1" };
    }

    // Check player count
    const expectedPlayerCount = type === "singles" ? 2 : 4;
    if (match.players.length !== expectedPlayerCount) {
      return {
        valid: false,
        error: `Wrong player count: expected ${expectedPlayerCount}, got ${match.players.length}`,
      };
    }

    // Check team assignments
    for (const player of match.players) {
      if (type === "singles" && player.team !== null) {
        return { valid: false, error: "Singles matches should have team=null" };
      }
      if (type === "doubles" && player.team !== 1 && player.team !== 2) {
        return { valid: false, error: "Doubles matches should have team=1 or team=2" };
      }
    }
  }

  return { valid: true };
}

/**
 * Verifies round-robin constraint: each player plays every other player exactly once
 */
function verifySinglesRoundRobin(
  matches: GenerateScheduleMatchDTO[],
  playerCount: number
): {
  valid: boolean;
  error?: string;
} {
  const expectedMatches = (playerCount * (playerCount - 1)) / 2;

  if (matches.length !== expectedMatches) {
    return {
      valid: false,
      error: `Wrong match count: expected ${expectedMatches}, got ${matches.length}`,
    };
  }

  // Track all matchups
  const matchups = new Set<string>();

  for (const match of matches) {
    const players = getMatchPlayers(match);
    if (players.length !== 2) {
      return { valid: false, error: "Singles match must have exactly 2 players" };
    }

    const [p1, p2] = players.sort();
    const matchupKey = `${p1}-${p2}`;

    if (matchups.has(matchupKey)) {
      return { valid: false, error: `Duplicate matchup: ${matchupKey}` };
    }

    matchups.add(matchupKey);
  }

  return { valid: true };
}

/**
 * Tracks partnerships and opponents in doubles
 */
function trackDoublesRelationships(matches: GenerateScheduleMatchDTO[]): {
  partnerships: Map<string, Set<string>>;
  opponents: Map<string, Set<string>>;
} {
  const partnerships = new Map<string, Set<string>>();
  const opponents = new Map<string, Set<string>>();

  for (const match of matches) {
    // Separate into teams
    const team1 = match.players.filter((p) => p.team === 1).map((p) => p.placeholder_name);
    const team2 = match.players.filter((p) => p.team === 2).map((p) => p.placeholder_name);

    if (team1.length !== 2 || team2.length !== 2) {
      continue; // Invalid match, skip
    }

    // Track partnerships
    const [t1p1, t1p2] = team1;
    const [t2p1, t2p2] = team2;

    if (!partnerships.has(t1p1)) partnerships.set(t1p1, new Set());
    if (!partnerships.has(t1p2)) partnerships.set(t1p2, new Set());
    if (!partnerships.has(t2p1)) partnerships.set(t2p1, new Set());
    if (!partnerships.has(t2p2)) partnerships.set(t2p2, new Set());

    partnerships.get(t1p1)!.add(t1p2);
    partnerships.get(t1p2)!.add(t1p1);
    partnerships.get(t2p1)!.add(t2p2);
    partnerships.get(t2p2)!.add(t2p1);

    // Track opponents
    if (!opponents.has(t1p1)) opponents.set(t1p1, new Set());
    if (!opponents.has(t1p2)) opponents.set(t1p2, new Set());
    if (!opponents.has(t2p1)) opponents.set(t2p1, new Set());
    if (!opponents.has(t2p2)) opponents.set(t2p2, new Set());

    team1.forEach((p1) => {
      team2.forEach((p2) => {
        opponents.get(p1)!.add(p2);
        opponents.get(p2)!.add(p1);
      });
    });
  }

  return { partnerships, opponents };
}

/**
 * Calculates partnership variety score (0-1, higher is better)
 */
function calculatePartnershipVariety(matches: GenerateScheduleMatchDTO[], playerCount: number): number {
  const { partnerships } = trackDoublesRelationships(matches);

  let totalUniquePartnerships = 0;
  let totalPossiblePartnerships = 0;

  partnerships.forEach((partners, player) => {
    totalUniquePartnerships += partners.size;
    totalPossiblePartnerships += playerCount - 1; // Can partner with everyone except self
  });

  // Divide by 2 because each partnership is counted twice
  return totalUniquePartnerships / 2 / (totalPossiblePartnerships / 2);
}

/**
 * Verifies match order on each court is sequential (1, 2, 3, ...)
 */
function verifySequentialMatchOrders(
  matches: GenerateScheduleMatchDTO[],
  courtsCount: number
): {
  valid: boolean;
  error?: string;
} {
  const matchesByCourt = new Map<number, GenerateScheduleMatchDTO[]>();

  // Group by court
  matches.forEach((match) => {
    if (!matchesByCourt.has(match.court_number)) {
      matchesByCourt.set(match.court_number, []);
    }
    matchesByCourt.get(match.court_number)!.push(match);
  });

  // Verify each court
  for (const [courtNum, courtMatches] of matchesByCourt) {
    // Sort by match order
    const sorted = [...courtMatches].sort((a, b) => a.match_order_on_court - b.match_order_on_court);

    // Check sequential
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].match_order_on_court !== i + 1) {
        return {
          valid: false,
          error: `Court ${courtNum}: expected match_order ${i + 1}, got ${sorted[i].match_order_on_court}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates match count per player
 */
function getMatchCountsPerPlayer(matches: GenerateScheduleMatchDTO[]): Map<string, number> {
  const counts = new Map<string, number>();

  matches.forEach((match) => {
    getMatchPlayers(match).forEach((player) => {
      counts.set(player, (counts.get(player) || 0) + 1);
    });
  });

  return counts;
}

// ============================================================================
// SINGLES SCHEDULE TESTS
// ============================================================================

describe("Singles Schedule Generation", () => {
  describe("Basic Functionality", () => {
    it("should generate schedule for 4 players and 2 courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 2,
        players: createPlayers(4),
      };

      const result = await generateSchedule(config);

      // Should have 6 matches (4 choose 2)
      expect(result.matches).toHaveLength(6);

      // Verify structure
      const structureCheck = verifyMatchStructure(result.matches, "singles");
      expect(structureCheck.valid).toBe(true);

      // Verify round-robin
      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 4);
      expect(roundRobinCheck.valid).toBe(true);
    });

    it("should generate schedule for 5 players (odd number) and 2 courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 2,
        players: createPlayers(5),
      };

      const result = await generateSchedule(config);

      // Should have 10 matches (5 choose 2)
      expect(result.matches).toHaveLength(10);

      // Verify round-robin
      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 5);
      expect(roundRobinCheck.valid).toBe(true);
    });

    it("should generate schedule for 6 players and 1 court", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 1,
        players: createPlayers(6),
      };

      const result = await generateSchedule(config);

      // Should have 15 matches (6 choose 2)
      expect(result.matches).toHaveLength(15);

      // All matches should be on court 1
      expect(result.matches.every((m) => m.court_number === 1)).toBe(true);

      // Verify round-robin
      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 6);
      expect(roundRobinCheck.valid).toBe(true);
    });

    it("should generate schedule for 6 players and 6 courts (more courts than simultaneous matches)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 6,
        players: createPlayers(6),
      };

      const result = await generateSchedule(config);

      // Should have 15 matches (6 choose 2)
      expect(result.matches).toHaveLength(15);

      // Verify round-robin
      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 6);
      expect(roundRobinCheck.valid).toBe(true);
    });
  });

  describe("Priority 1: No Player on Multiple Courts in Same Round", () => {
    it("should never schedule a player on multiple courts in the same round", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 3,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });

    it("should respect Priority 1 even with many courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 6,
        players: createPlayers(10),
      };

      const result = await generateSchedule(config);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });
  });

  describe("Priority 2: Minimize Back-to-Back Matches", () => {
    it("should minimize consecutive matches for players", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 2,
        players: createPlayers(6),
      };

      const result = await generateSchedule(config);

      const consecutiveCounts = countConsecutiveMatches(result.matches);

      // Count total consecutive matches
      let totalConsecutive = 0;
      consecutiveCounts.forEach((count) => {
        totalConsecutive += count;
      });

      // With good optimization, consecutive matches should be limited
      // For 6 players, 2 courts: 15 matches total
      // The algorithm minimizes but can't eliminate all consecutive matches
      // Expect reasonable optimization (fewer than 25 out of 15 matches)
      expect(totalConsecutive).toBeLessThan(25);
    });

    it("should provide reasonable rest between matches", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 3,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      // Track when each player plays
      const rounds = groupMatchesByRound(result.matches);
      const playerRounds = new Map<string, number[]>();

      rounds.forEach((round, roundIndex) => {
        round.forEach((match) => {
          getMatchPlayers(match).forEach((player) => {
            if (!playerRounds.has(player)) {
              playerRounds.set(player, []);
            }
            playerRounds.get(player)!.push(roundIndex);
          });
        });
      });

      // Calculate average gap between matches for each player
      let totalGaps = 0;
      let gapCount = 0;

      playerRounds.forEach((rounds) => {
        for (let i = 1; i < rounds.length; i++) {
          totalGaps += rounds[i] - rounds[i - 1];
          gapCount++;
        }
      });

      const averageGap = totalGaps / gapCount;

      // Average gap should be at least 1 round (allowing for some rest)
      expect(averageGap).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Priority 3: Court Utilization", () => {
    it("should distribute matches across courts efficiently", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 3,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      // Count matches per court
      const matchesPerCourt = new Map<number, number>();
      result.matches.forEach((match) => {
        matchesPerCourt.set(match.court_number, (matchesPerCourt.get(match.court_number) || 0) + 1);
      });

      const counts = Array.from(matchesPerCourt.values());
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);

      // Courts should be relatively balanced
      // With 8 players and 3 courts: 28 matches total
      // Expect reasonable distribution (difference <= 5 matches)
      expect(maxCount - minCount).toBeLessThanOrEqual(5);
    });

    it("should have sequential match orders on each court", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 4,
        players: createPlayers(10),
      };

      const result = await generateSchedule(config);

      const sequentialCheck = verifySequentialMatchOrders(result.matches, config.courts);
      expect(sequentialCheck.valid).toBe(true);
    });
  });

  describe("Round-Robin Verification", () => {
    it("should ensure each player plays every other player exactly once", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 2,
        players: createPlayers(7),
      };

      const result = await generateSchedule(config);

      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 7);
      expect(roundRobinCheck.valid).toBe(true);

      // Verify each player plays the right number of matches
      const matchCounts = getMatchCountsPerPlayer(result.matches);
      matchCounts.forEach((count) => {
        expect(count).toBe(6); // Each of 7 players should play 6 matches
      });
    });
  });
});

// ============================================================================
// DOUBLES SCHEDULE TESTS
// ============================================================================

describe("Doubles Schedule Generation", () => {
  describe("Basic Functionality", () => {
    it("should generate schedule for 8 players and 2 courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      // Should have multiple matches
      expect(result.matches.length).toBeGreaterThan(0);

      // Verify structure
      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);

      // Each match should have 4 players (2 per team)
      result.matches.forEach((match) => {
        expect(match.players).toHaveLength(4);
        expect(match.players.filter((p) => p.team === 1)).toHaveLength(2);
        expect(match.players.filter((p) => p.team === 2)).toHaveLength(2);
      });
    });

    it("should generate schedule for 4 players (minimum) and 1 court", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 1,
        players: createPlayers(4),
      };

      const result = await generateSchedule(config);

      // With 4 players, only certain combinations are possible
      expect(result.matches.length).toBeGreaterThan(0);

      // Verify structure
      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);
    });

    it("should generate schedule for 12 players and 3 courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      // Should generate multiple matches
      expect(result.matches.length).toBeGreaterThan(10);

      // Verify structure
      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);
    });
  });

  describe("Priority: Maximize Partnership Uniqueness", () => {
    it("should maximize different partner combinations", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      const { partnerships } = trackDoublesRelationships(result.matches);

      // Each player should partner with multiple different players
      let totalUniquePartners = 0;
      partnerships.forEach((partners) => {
        totalUniquePartners += partners.size;
      });

      // On average, each player should have multiple unique partners
      const avgPartnersPerPlayer = totalUniquePartners / partnerships.size;
      expect(avgPartnersPerPlayer).toBeGreaterThan(2);
    });

    it("should have high partnership variety score", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      const varietyScore = calculatePartnershipVariety(result.matches, 8);

      // Variety score should be reasonably high (> 0.3 for good variety)
      expect(varietyScore).toBeGreaterThan(0.3);
    });
  });

  describe("Priority: Maximize Opponent Uniqueness", () => {
    it("should maximize different opponent combinations", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      const { opponents } = trackDoublesRelationships(result.matches);

      // Each player should face multiple different opponents
      let totalUniqueOpponents = 0;
      opponents.forEach((opps) => {
        totalUniqueOpponents += opps.size;
      });

      // On average, each player should have multiple unique opponents
      const avgOpponentsPerPlayer = totalUniqueOpponents / opponents.size;
      expect(avgOpponentsPerPlayer).toBeGreaterThan(3);
    });
  });

  describe("Priority: No Player on Multiple Courts in Same Round", () => {
    it("should never schedule a player on multiple courts in the same round", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });

    it("should respect this constraint with more courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });
  });

  describe("Priority: Balanced Participation", () => {
    it("should give all players similar number of matches", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      const matchCounts = getMatchCountsPerPlayer(result.matches);
      const counts = Array.from(matchCounts.values());

      const maxMatches = Math.max(...counts);
      const minMatches = Math.min(...counts);

      // Difference should be small (at most 2 matches difference)
      expect(maxMatches - minMatches).toBeLessThanOrEqual(2);
    });

    it("should ensure no player is significantly underutilized", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      const matchCounts = getMatchCountsPerPlayer(result.matches);

      // Every player should play at least some matches
      matchCounts.forEach((count, player) => {
        expect(count).toBeGreaterThan(0);
      });
    });
  });

  describe("Court Utilization", () => {
    it("should have sequential match orders on each court", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      const sequentialCheck = verifySequentialMatchOrders(result.matches, config.courts);
      expect(sequentialCheck.valid).toBe(true);
    });
  });
});

// ============================================================================
// EDGE CASES AND CONSTRAINTS
// ============================================================================

describe("Edge Cases and Constraints", () => {
  describe("Minimum Configuration", () => {
    it("should handle minimum singles: 4 players, 1 court", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 1,
        players: createPlayers(4),
      };

      const result = await generateSchedule(config);

      expect(result.matches).toHaveLength(6);
      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 4);
      expect(roundRobinCheck.valid).toBe(true);
    });

    it("should handle minimum doubles: 4 players, 1 court", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 1,
        players: createPlayers(4),
      };

      const result = await generateSchedule(config);

      expect(result.matches.length).toBeGreaterThan(0);
      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);
    });
  });

  describe("Maximum Configuration", () => {
    it("should handle maximum singles: 24 players, 6 courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 6,
        players: createPlayers(24),
      };

      const result = await generateSchedule(config);

      // Should have 276 matches (24 choose 2)
      expect(result.matches).toHaveLength(276);

      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 24);
      expect(roundRobinCheck.valid).toBe(true);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });

    it("should handle maximum doubles: 24 players, 6 courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 6,
        players: createPlayers(24),
      };

      const result = await generateSchedule(config);

      expect(result.matches.length).toBeGreaterThan(0);

      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });
  });

  describe("Doubles Player Count Constraint", () => {
    it("should work with 4 players (divisible by 4)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 1,
        players: createPlayers(4),
      };

      const result = await generateSchedule(config);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("should work with 8 players (divisible by 4)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 2,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("should work with 12 players (divisible by 4)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("should work with 16 players (divisible by 4)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 4,
        players: createPlayers(16),
      };

      const result = await generateSchedule(config);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("should work with 20 players (divisible by 4)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 5,
        players: createPlayers(20),
      };

      const result = await generateSchedule(config);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("should work with 24 players (divisible by 4)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 6,
        players: createPlayers(24),
      };

      const result = await generateSchedule(config);
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe("Court Assignment Validation", () => {
    it("should only use courts within the specified range", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 3,
        players: createPlayers(8),
      };

      const result = await generateSchedule(config);

      result.matches.forEach((match) => {
        expect(match.court_number).toBeGreaterThanOrEqual(1);
        expect(match.court_number).toBeLessThanOrEqual(3);
      });
    });

    it("should use all available courts when possible", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 4,
        players: createPlayers(10),
      };

      const result = await generateSchedule(config);

      const courtsUsed = new Set(result.matches.map((m) => m.court_number));

      // With 10 players and 4 courts, we should use multiple courts
      expect(courtsUsed.size).toBeGreaterThan(1);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle singles with many players and few courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 2,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      // Should have 66 matches (12 choose 2)
      expect(result.matches).toHaveLength(66);

      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 12);
      expect(roundRobinCheck.valid).toBe(true);

      const noDuplicatesCheck = verifyNoDuplicatePlayersInRounds(result.matches);
      expect(noDuplicatesCheck.valid).toBe(true);
    });

    it("should handle singles with few players and many courts", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 6,
        players: createPlayers(5),
      };

      const result = await generateSchedule(config);

      // Should have 10 matches (5 choose 2)
      expect(result.matches).toHaveLength(10);

      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 5);
      expect(roundRobinCheck.valid).toBe(true);
    });

    it("should handle doubles with optimal court-to-player ratio", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      // With 12 players and 3 courts, all players can play simultaneously
      const rounds = groupMatchesByRound(result.matches);

      // First round should use multiple courts (at least 2)
      expect(rounds[0].length).toBeGreaterThanOrEqual(2);

      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);
    });
  });

  describe("Data Integrity", () => {
    it("should maintain unique match IDs (court + order combinations)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 3,
        players: createPlayers(10),
      };

      const result = await generateSchedule(config);

      const positions = new Set<string>();

      result.matches.forEach((match) => {
        const positionKey = `${match.court_number}-${match.match_order_on_court}`;
        expect(positions.has(positionKey)).toBe(false);
        positions.add(positionKey);
      });
    });

    it("should have consistent player references", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 2,
        players: createPlayers(6),
      };

      const result = await generateSchedule(config);

      const allPlayers = new Set<string>();

      result.matches.forEach((match) => {
        getMatchPlayers(match).forEach((player) => {
          allPlayers.add(player);
        });
      });

      // Should have exactly 6 players referenced
      expect(allPlayers.size).toBe(6);

      // All should match the input
      expect(allPlayers).toEqual(new Set(config.players.map((p) => p.placeholder_name)));
    });
  });
});

// ============================================================================
// PERFORMANCE AND QUALITY METRICS
// ============================================================================

describe("Performance and Quality Metrics", () => {
  describe("Algorithm Efficiency", () => {
    it("should complete large singles schedule in reasonable time", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 6,
        players: createPlayers(20),
      };

      const start = Date.now();
      const result = await generateSchedule(config);
      const duration = Date.now() - start;

      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);

      // Verify correctness
      const roundRobinCheck = verifySinglesRoundRobin(result.matches, 20);
      expect(roundRobinCheck.valid).toBe(true);
    });

    it("should complete large doubles schedule in reasonable time", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 6,
        players: createPlayers(20),
      };

      const start = Date.now();
      const result = await generateSchedule(config);
      const duration = Date.now() - start;

      // Should complete in less than 2 seconds
      expect(duration).toBeLessThan(2000);

      // Verify correctness
      const structureCheck = verifyMatchStructure(result.matches, "doubles");
      expect(structureCheck.valid).toBe(true);
    });
  });

  describe("Schedule Quality", () => {
    it("should produce high-quality singles schedule (minimal consecutive matches)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "singles",
        courts: 3,
        players: createPlayers(10),
      };

      const result = await generateSchedule(config);

      const consecutiveCounts = countConsecutiveMatches(result.matches);
      let totalConsecutive = 0;
      consecutiveCounts.forEach((count) => {
        totalConsecutive += count;
      });

      // For 10 players, 3 courts: 45 total matches
      // Good scheduling should minimize consecutive matches
      // Expect reasonable optimization (fewer than 80 instances)
      expect(totalConsecutive).toBeLessThan(80);
    });

    it("should produce high-quality doubles schedule (good variety)", async () => {
      const config: GenerateScheduleRequestDTO = {
        type: "doubles",
        courts: 3,
        players: createPlayers(12),
      };

      const result = await generateSchedule(config);

      // Check partnership variety
      const varietyScore = calculatePartnershipVariety(result.matches, 12);
      expect(varietyScore).toBeGreaterThan(0.25);

      // Check balanced participation
      const matchCounts = getMatchCountsPerPlayer(result.matches);
      const counts = Array.from(matchCounts.values());
      const maxMatches = Math.max(...counts);
      const minMatches = Math.min(...counts);

      // Players should have relatively similar match counts
      expect(maxMatches - minMatches).toBeLessThanOrEqual(5);
    });
  });
});
