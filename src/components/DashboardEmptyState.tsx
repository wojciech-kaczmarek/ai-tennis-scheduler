import { Squares2X2Icon } from "@heroicons/react/24/outline";

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

      {/* Optional: Call to action button (commented out for now, can be enabled when create tournament page is ready) */}
      {/* <Button onClick={onCreate} variant="default">
        <PlusIcon className="mr-2 h-4 w-4" />
        Create Tournament
      </Button> */}
    </div>
  );
}
