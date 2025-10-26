// ============================================================================
// ScheduleEditor Component
// ============================================================================
// Core editing component for managing schedule modifications

import { useScheduleEditor } from "@/lib/hooks/useScheduleEditor";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ScheduleEditorProps } from "@/lib/viewModels/tournamentDetailsViewModels";

/**
 * ScheduleEditor Component
 * 
 * Manages schedule editing state, validates changes, detects conflicts,
 * and handles save/cancel operations. Delegates display to ScheduleGrid.
 * 
 * Features:
 * - Track changes to match court assignments and order
 * - Real-time conflict detection
 * - Save changes with automatic rollback on failure
 * - Cancel changes to revert to original state
 * 
 * @param schedule - Schedule data with matches
 * @param maxCourts - Maximum number of courts available
 * @param onSaveSuccess - Callback to trigger after successful save (usually refetch)
 */
export function ScheduleEditor({
  schedule,
  maxCourts,
  onSaveSuccess,
}: ScheduleEditorProps) {
  const {
    displayMatches,
    isDirty,
    isSaving,
    saveError,
    conflicts,
    hasConflicts,
    updateMatch,
    saveChanges,
    cancelChanges,
  } = useScheduleEditor({
    scheduleId: schedule.id,
    initialMatches: schedule.matches,
    maxCourts,
  });

  /**
   * Handle save button click
   * Saves changes and triggers refetch on success
   */
  const handleSave = async () => {
    try {
      await saveChanges();
      // If saveChanges completes without throwing, it was successful
      // The hook clears editedMatches on success, so we can trigger refetch
      onSaveSuccess();
    } catch (error) {
      // Error is already handled by the hook (saveError state)
      // Just log it here for debugging
      console.error("Save failed:", error);
    }
  };

  /**
   * Handle cancel button click
   * Reverts all changes to original state
   */
  const handleCancel = () => {
    cancelChanges();
  };

  return (
    <div className="bg-card rounded-lg shadow p-6">
      {/* Header with title and action buttons */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Match Schedule</h2>
        
        {isDirty && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Cancel changes"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || hasConflicts}
              aria-label="Save changes"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Conflict warning */}
      {hasConflicts && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Conflicts Detected</AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              {conflicts.map((conflict, index) => (
                <div key={index}>{conflict.message}</div>
              ))}
            </div>
            <p className="mt-2 text-sm">
              Please resolve these conflicts before saving.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Save error alert */}
      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Save Failed</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Schedule grid with editable controls */}
      <ScheduleGrid
        matches={displayMatches}
        editable={true}
        maxCourts={maxCourts}
        onMatchUpdate={updateMatch}
      />

      {/* Helper text for users */}
      {!isDirty && displayMatches.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          Edit court assignments or match order to make changes.
        </p>
      )}
    </div>
  );
}

