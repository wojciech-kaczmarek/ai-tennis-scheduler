import { Squares2X2Icon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

/**
 * Empty state component displayed when no tournaments exist
 */
export function DashboardEmptyState() {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <Squares2X2Icon className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600" aria-hidden="true" />

      {/* Message */}
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">No tournaments yet</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
        Get started by creating your first tournament with players, courts, and match schedules.
      </p>

      {/* Call to action button */}
      <Button asChild variant="default" size="lg">
        <a href="/create" aria-label="Create your first tournament">
          <PlusIcon />
          Create Tournament
        </a>
      </Button>
    </div>
  );
}
