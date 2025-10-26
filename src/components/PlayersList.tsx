// ============================================================================
// PlayersList Component
// ============================================================================
// Displays all tournament players in a compact, read-only grid layout

import type { PlayersListProps } from "@/lib/viewModels/tournamentDetailsViewModels";

/**
 * Extracts initials from a player name
 * @param name - Full player name
 * @returns Initials (up to 2 characters)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word: take first 2 characters
    return name.slice(0, 2).toUpperCase();
  }

  // Multiple words: take first character of first two words
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * PlayersList Component
 *
 * Displays tournament players in a responsive grid layout.
 * Each player is shown with an avatar (initials) and their name.
 * Uses custom names when available, otherwise falls back to placeholder names.
 *
 * @param players - Array of player objects
 */
export function PlayersList({ players }: PlayersListProps) {
  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Players</h2>

      {players.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((player) => {
            const displayName = player.name || player.placeholder_name;
            const initials = getInitials(displayName);

            return (
              <div key={player.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                <div
                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <span className="text-xs font-semibold text-primary">{initials}</span>
                </div>

                <span className="text-sm truncate" title={displayName}>
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">No players found</div>
      )}
    </div>
  );
}
