// ============================================================================
// TournamentDetails Component
// ============================================================================
// Main orchestrator component for tournament details view

import { useTournamentDetails } from "@/lib/hooks/useTournamentDetails";
import { TournamentHeader } from "@/components/TournamentHeader";
import { PlayersList } from "@/components/PlayersList";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TournamentDetailsProps } from "@/lib/viewModels/tournamentDetailsViewModels";

/**
 * Loading skeleton component
 * Displays animated placeholders while data is loading
 */
function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 animate-pulse">
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-muted rounded w-1/2 mb-2"></div>
        <div className="h-6 bg-muted rounded w-1/3"></div>
      </div>
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-lg shadow p-6">
        <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error display component
 * Shows error message with action buttons
 */
function ErrorDisplay({ error, onBack, onRetry }: { error: string; onBack: () => void; onRetry: () => void }) {
  return (
    <div className="container mx-auto py-8">
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={onBack} variant="default">
          Back to Dashboard
        </Button>
        <Button onClick={onRetry} variant="outline">
          Retry
        </Button>
      </div>
    </div>
  );
}

/**
 * TournamentDetails Component
 *
 * Main container component that orchestrates the tournament details view.
 * Handles data fetching, loading states, errors, and coordinates all child components.
 *
 * Features:
 * - Fetches tournament data on mount
 * - Displays loading state while fetching
 * - Handles error states with user-friendly messages
 * - Renders header, players list, and editable schedule
 * - Manages navigation back to dashboard
 *
 * @param tournamentId - ID of the tournament to display
 */
export function TournamentDetails({ tournamentId }: TournamentDetailsProps) {
  const { tournament, isLoading, error, refetch } = useTournamentDetails(tournamentId);

  /**
   * Navigate back to dashboard
   * Uses window.location for client-side navigation in Astro
   */
  const handleBack = () => {
    window.location.href = "/";
  };

  /**
   * Handle successful save
   * Triggers refetch to get updated data from server
   */
  const handleSaveSuccess = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} onBack={handleBack} onRetry={refetch} />;
  }

  // No tournament data (should not happen if no error, but defensive check)
  if (!tournament) {
    return <ErrorDisplay error="Tournament data not available" onBack={handleBack} onRetry={refetch} />;
  }

  // Success state - render full tournament details
  return (
    <div className="container mx-auto py-8">
      <TournamentHeader
        name={tournament.name}
        type={tournament.type}
        courts={tournament.courts}
        playersCount={tournament.players.length}
        createdAt={tournament.created_at}
        onBack={handleBack}
      />

      <PlayersList players={tournament.players} />

      <ScheduleEditor schedule={tournament.schedule} maxCourts={tournament.courts} onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}






