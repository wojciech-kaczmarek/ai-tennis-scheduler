// ============================================================================
// ScheduleGrid Component
// ============================================================================
// Reusable component for displaying match schedules in a grid format
// Supports both read-only (preview) and editable (details) modes

import type { ScheduleGridProps } from "@/lib/viewModels/tournamentDetailsViewModels";
import type { TournamentType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * Formats match players display based on tournament type
 * For singles: "Player 1 vs Player 2"
 * For doubles: "Player 1 & Player 2 vs Player 3 & Player 4"
 */
function formatMatchPlayers(
  players: Array<{ name: string | null; placeholder_name: string; team: number | null }>,
  tournamentType: TournamentType
): string {
  if (tournamentType === "singles") {
    const playerNames = players.map((p) => p.name || p.placeholder_name);
    return playerNames.join(" vs ");
  } else {
    // doubles
    const team1 = players.filter((p) => p.team === 1);
    const team2 = players.filter((p) => p.team === 2);
    
    const team1Names = team1.map((p) => p.name || p.placeholder_name).join(" & ");
    const team2Names = team2.map((p) => p.name || p.placeholder_name).join(" & ");
    
    return `${team1Names} vs ${team2Names}`;
  }
}

/**
 * ScheduleGrid Component
 * 
 * Displays matches organized by court and match order.
 * In editable mode, allows changing court assignments and match orders.
 * 
 * @param matches - Array of matches to display
 * @param editable - Whether the grid should be editable
 * @param maxCourts - Maximum number of courts (required if editable)
 * @param onMatchUpdate - Callback for match updates (required if editable)
 */
export function ScheduleGrid({
  matches,
  editable,
  maxCourts,
  onMatchUpdate,
}: ScheduleGridProps) {
  // Validation for editable mode
  if (editable && (!maxCourts || !onMatchUpdate)) {
    console.error("ScheduleGrid: maxCourts and onMatchUpdate are required in editable mode");
    return null;
  }

  // Group matches by court
  const matchesByCourt = matches.reduce((acc, match) => {
    const court = match.court_number;
    if (!acc[court]) {
      acc[court] = [];
    }
    acc[court].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  // Get sorted court numbers
  const courtNumbers = Object.keys(matchesByCourt)
    .map(Number)
    .sort((a, b) => a - b);

  // Infer tournament type from first match (all matches should have same type)
  const tournamentType: TournamentType =
    matches.length > 0 && matches[0].players.some((p) => p.team !== null)
      ? "doubles"
      : "singles";

  return (
    <div className="space-y-4">
      {courtNumbers.map((court) => (
        <div key={court} className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-lg">Court {court}</h3>
          <div className="space-y-2">
            {matchesByCourt[court]
              .sort((a, b) => a.match_order_on_court - b.match_order_on_court)
              .map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-4 p-3 bg-muted rounded"
                >
                  {editable ? (
                    <>
                      {/* Court selector */}
                      <div className="w-32">
                        <Select
                          value={match.court_number.toString()}
                          onValueChange={(value) =>
                            onMatchUpdate!(match.id, "court", parseInt(value, 10))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Court" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: maxCourts! }, (_, i) => i + 1).map(
                              (n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  Court {n}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Order input */}
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={match.match_order_on_court}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value)) {
                              onMatchUpdate!(match.id, "order", value);
                            }
                          }}
                          className="text-center"
                          aria-label={`Match order for match ${match.id}`}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-sm font-medium w-24">
                      Match {match.match_order_on_court}
                    </span>
                  )}

                  {/* Player names */}
                  <div className="flex-1 text-sm">
                    {formatMatchPlayers(match.players, tournamentType)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {courtNumbers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No matches scheduled
        </div>
      )}
    </div>
  );
}

