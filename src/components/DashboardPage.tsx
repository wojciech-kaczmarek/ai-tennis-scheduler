import { useState, useCallback } from "react";
import { useTournaments } from "@/lib/hooks/useTournaments";
import { deleteTournament } from "@/lib/services/tournamentApiClient";
import { TournamentCard } from "@/components/TournamentCard";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { DashboardEmptyState } from "@/components/DashboardEmptyState";
import { DashboardHeader } from "@/components/DashboardHeader";
import type { TournamentListItemDTO } from "@/types";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Main Dashboard page component that orchestrates all tournament listing functionality
 */
export function DashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<TournamentListItemDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useTournaments(page, pageSize);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle page size change - reset to page 1
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  // Open delete confirmation dialog
  const handleDeleteClick = useCallback(
    (tournamentId: string) => {
      const tournament = data?.items.find((t) => t.id === tournamentId);
      if (tournament) {
        setDeleteTarget(tournament);
        setDeleteError(null);
      }
    },
    [data?.items]
  );

  // Close delete confirmation dialog
  const handleDeleteCancel = useCallback(() => {
    if (!isDeleting) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  }, [isDeleting]);

  // Confirm and execute deletion
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTournament(deleteTarget.id);

      // Close dialog and refetch data
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete tournament";
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, refetch]);

  // Render loading state
  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        <div
          className="flex min-h-[400px] items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label="Loading tournaments"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading tournaments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        <div
          className="rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-700 dark:bg-red-900/20"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon
              className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200">Error loading tournaments</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => refetch()}
                className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tournaments = data?.items || [];
  const pagination = data?.pagination;
  const isEmpty = tournaments.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <DashboardHeader />

      {/* Main content area */}
      {isEmpty ? (
        <DashboardEmptyState />
      ) : (
        <>
          {/* Tournament grid */}
          <div
            className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Tournament list"
            data-testid="tournaments-list"
          >
            {tournaments.map((tournament) => (
              <div key={tournament.id} role="listitem">
                <TournamentCard tournament={tournament} onDelete={handleDeleteClick} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && (
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteConfirmationDialog
          isOpen={true}
          tournamentName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
        />
      )}

      {/* Delete error toast (if any) */}
      {deleteError && (
        <div
          className="fixed bottom-4 right-4 max-w-sm rounded-lg border border-red-300 bg-red-50 p-4 shadow-lg dark:border-red-700 dark:bg-red-900/20"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon
              className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Close error message"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
