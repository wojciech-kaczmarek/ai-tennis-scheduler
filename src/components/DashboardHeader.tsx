import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { clearWizardStorage } from "@/lib/wizardStorage";

/**
 * Reusable header component for the Dashboard page
 * Displays the page title, description, and "Create Tournament" button
 */
export function DashboardHeader() {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Tournaments</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage and view all your tennis tournaments</p>
      </div>
      <Button asChild variant="default">
        <a
          href="/create"
          onClick={clearWizardStorage}
          aria-label="Create new tournament"
          data-testid="create-tournament-button"
        >
          <PlusIcon />
          Create Tournament
        </a>
      </Button>
    </div>
  );
}
