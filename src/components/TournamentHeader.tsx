// ============================================================================
// TournamentHeader Component
// ============================================================================
// Displays tournament metadata in a card-like header section

import { Button } from "@/components/ui/button";
import { UsersIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import type { TournamentHeaderProps } from "@/lib/viewModels/tournamentDetailsViewModels";
import type { TournamentType } from "@/types";

/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get badge CSS classes based on tournament type
 * @param type - Tournament type (singles/doubles)
 * @returns CSS classes for the badge
 */
function getTournamentTypeBadgeClass(type: TournamentType): string {
  return type === "singles"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
}

/**
 * TournamentHeader Component
 *
 * Displays tournament metadata including name, type, courts, players, and creation date.
 * Includes a back button for navigation to the dashboard.
 *
 * @param name - Tournament name
 * @param type - Tournament type (singles/doubles)
 * @param courts - Number of courts
 * @param playersCount - Number of players
 * @param createdAt - Creation date (ISO string)
 * @param onBack - Callback for back button click
 */
export function TournamentHeader({ name, type, courts, playersCount, createdAt, onBack }: TournamentHeaderProps) {
  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2" aria-label="Back to dashboard">
            ← Back
          </Button>

          <h1 className="text-3xl font-bold mb-3">{name}</h1>

          <div className="flex flex-wrap gap-4 items-center mb-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTournamentTypeBadgeClass(
                type
              )}`}
              aria-label={`Tournament type: ${type}`}
            >
              {type === "singles" ? "Singles" : "Doubles"}
            </span>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <UsersIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>{playersCount}</strong> {playersCount === 1 ? "player" : "players"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ClipboardDocumentListIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>{courts}</strong> {courts === 1 ? "court" : "courts"}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Created: {formatDate(createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
