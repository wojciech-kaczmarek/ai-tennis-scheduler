import { Button } from "@/components/ui/button";
import type { TournamentListItemDTO } from "@/types";
import { TrashIcon, UsersIcon, ClipboardDocumentListIcon, CalendarIcon } from "@heroicons/react/24/outline";

interface TournamentCardProps {
  tournament: TournamentListItemDTO;
  onDelete: (id: string) => void;
}

/**
 * Card component displaying tournament information with delete action
 */
export function TournamentCard({ tournament, onDelete }: TournamentCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTournamentTypeBadgeClass = (type: string) => {
    return type === "singles"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  };

  const handleCardClick = () => {
    window.location.href = `/tournaments/${tournament.id}`;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when deleting
    onDelete(tournament.id);
  };

  return (
    <article
      className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
      aria-label={`Tournament: ${tournament.name}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">{tournament.name}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTournamentTypeBadgeClass(
              tournament.type
            )}`}
            aria-label={`Tournament type: ${tournament.type}`}
          >
            {tournament.type}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          aria-label={`Delete tournament ${tournament.name}`}
          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
        >
          <TrashIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center">
          <UsersIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>
            <strong>{tournament.players_count}</strong> players
          </span>
        </div>
        <div className="flex items-center">
          <ClipboardDocumentListIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>
            <strong>{tournament.courts}</strong> {tournament.courts === 1 ? "court" : "courts"}
          </span>
        </div>
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>
            Created on <time dateTime={tournament.created_at}>{formatDate(tournament.created_at)}</time>
          </span>
        </div>
      </div>
    </article>
  );
}
