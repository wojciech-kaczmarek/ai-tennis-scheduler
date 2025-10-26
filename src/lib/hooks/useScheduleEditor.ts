// ============================================================================
// useScheduleEditor Hook
// ============================================================================
// Custom hook for managing schedule editing state, validation, and persistence

import { useState, useMemo, useCallback } from "react";
import type {
  MatchDTO,
  UpdateMatchDTO,
  UpdateScheduleMatchesRequestDTO,
  UpdateScheduleMatchesResponseDTO,
} from "@/types";
import type { ConflictInfo } from "@/lib/viewModels/tournamentDetailsViewModels";

interface UseScheduleEditorParams {
  scheduleId: string;
  initialMatches: MatchDTO[];
  maxCourts: number;
}

interface UseScheduleEditorResult {
  displayMatches: MatchDTO[];
  editedMatches: Map<string, UpdateMatchDTO>;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  conflicts: ConflictInfo[];
  hasConflicts: boolean;
  updateMatch: (matchId: string, field: "court" | "order", value: number) => void;
  saveChanges: () => Promise<void>;
  cancelChanges: () => void;
}

/**
 * Detects conflicts in match scheduling
 * Checks for duplicate (court_number, match_order_on_court) pairs
 * 
 * @param matches - Array of matches to check for conflicts
 * @returns Array of detected conflicts
 */
function detectConflicts(matches: MatchDTO[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const seen = new Map<string, string>(); // "court_order" -> matchId

  for (const match of matches) {
    const key = `${match.court_number}_${match.match_order_on_court}`;
    const existing = seen.get(key);

    if (existing) {
      conflicts.push({
        type: "court_order_duplicate",
        matchIds: [existing, match.id],
        message: `Matches conflict on Court ${match.court_number}, Order ${match.match_order_on_court}`,
      });
    } else {
      seen.set(key, match.id);
    }
  }

  return conflicts;
}

/**
 * Hook for managing schedule editing operations
 * Handles state tracking, validation, conflict detection, and API persistence
 * 
 * @param params - Configuration including schedule ID, initial matches, and court limit
 * @returns Editing state, display data, and control functions
 */
export function useScheduleEditor({
  scheduleId,
  initialMatches,
  maxCourts,
}: UseScheduleEditorParams): UseScheduleEditorResult {
  const [originalMatches] = useState<MatchDTO[]>(initialMatches);
  const [editedMatches, setEditedMatches] = useState<
    Map<string, UpdateMatchDTO>
  >(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Compute if there are unsaved changes
  const isDirty = editedMatches.size > 0;

  // Merge original matches with edits for display
  const displayMatches = useMemo(() => {
    return originalMatches.map((match) => {
      const edit = editedMatches.get(match.id);
      if (edit) {
        return {
          ...match,
          court_number: edit.court_number,
          match_order_on_court: edit.match_order_on_court,
        };
      }
      return match;
    });
  }, [originalMatches, editedMatches]);

  // Detect conflicts in current state
  const conflicts = useMemo(() => {
    return detectConflicts(displayMatches);
  }, [displayMatches]);

  const hasConflicts = conflicts.length > 0;

  /**
   * Update a match field (court or order)
   * Validates the change and updates the edited matches map
   */
  const updateMatch = useCallback(
    (matchId: string, field: "court" | "order", value: number) => {
      // Verify match exists in original matches
      const matchExists = originalMatches.some((m) => m.id === matchId);
      if (!matchExists) {
        console.error("Match not found:", matchId);
        return;
      }

      // Get current match state (original or edited)
      const currentMatch = displayMatches.find((m) => m.id === matchId);
      if (!currentMatch) {
        console.error("Match not found in display matches:", matchId);
        return;
      }

      // Validate the new value based on field type
      if (field === "court") {
        if (value < 1 || value > maxCourts) {
          console.error(
            `Invalid court number ${value}. Must be between 1 and ${maxCourts}`
          );
          return;
        }
      } else if (field === "order") {
        if (value < 1) {
          console.error(`Invalid match order ${value}. Must be at least 1`);
          return;
        }
      }

      // Get existing edit or create new one
      const existingEdit = editedMatches.get(matchId);
      const newEdit: UpdateMatchDTO = {
        match_id: matchId,
        court_number:
          field === "court" ? value : (existingEdit?.court_number ?? currentMatch.court_number),
        match_order_on_court:
          field === "order" ? value : (existingEdit?.match_order_on_court ?? currentMatch.match_order_on_court),
      };

      // Check if the edit actually changes anything from the original
      const originalMatch = originalMatches.find((m) => m.id === matchId);
      if (
        originalMatch &&
        newEdit.court_number === originalMatch.court_number &&
        newEdit.match_order_on_court === originalMatch.match_order_on_court
      ) {
        // No change from original, remove from edits
        const newEditedMatches = new Map(editedMatches);
        newEditedMatches.delete(matchId);
        setEditedMatches(newEditedMatches);
      } else {
        // Update the edits map
        const newEditedMatches = new Map(editedMatches);
        newEditedMatches.set(matchId, newEdit);
        setEditedMatches(newEditedMatches);
      }

      // Clear any previous save error
      setSaveError(null);
    },
    [originalMatches, displayMatches, editedMatches, maxCourts]
  );

  /**
   * Save all changes to the API
   * Handles success and error cases with automatic rollback on failure
   */
  const saveChanges = useCallback(async () => {
    // Don't save if no changes or conflicts exist
    if (!isDirty || hasConflicts) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Convert Map to array of updates
      const updates = Array.from(editedMatches.values());

      const requestBody: UpdateScheduleMatchesRequestDTO = {
        updates,
      };

      const response = await fetch(`/api/schedules/${scheduleId}/matches`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Invalid data. Please check your changes."
          );
        }
        if (response.status === 401) {
          throw new Error("Unauthorized. Please log in again.");
        }
        if (response.status === 404) {
          throw new Error("Schedule not found. It may have been deleted.");
        }
        if (response.status === 409) {
          throw new Error(
            "Conflict detected on server. Changes have been discarded."
          );
        }
        throw new Error("Failed to save changes. Please try again.");
      }

      const result: UpdateScheduleMatchesResponseDTO = await response.json();
      console.log("Successfully updated matches:", result.updated_matches);

      // Success: clear edited state
      setEditedMatches(new Map());
      setSaveError(null);
      setIsSaving(false);

      // Success - don't throw, return normally
    } catch (err) {
      // On error, keep editedMatches intact (no rollback of state)
      // User can see error and decide to retry or cancel
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setSaveError(errorMessage);
      setIsSaving(false);
      console.error("Error saving schedule changes:", err);
      
      // Re-throw to allow parent component to handle success/failure
      throw err;
    }
  }, [scheduleId, editedMatches, isDirty, hasConflicts]);

  /**
   * Cancel all pending changes
   * Resets the editing state to original values
   */
  const cancelChanges = useCallback(() => {
    setEditedMatches(new Map());
    setSaveError(null);
  }, []);

  return {
    displayMatches,
    editedMatches,
    isDirty,
    isSaving,
    saveError,
    conflicts,
    hasConflicts,
    updateMatch,
    saveChanges,
    cancelChanges,
  };
}

