// ============================================================================
// useTournamentDetails Hook
// ============================================================================
// Custom hook for fetching and managing tournament details data

import { useState, useEffect, useCallback } from "react";
import type { TournamentDetailDTO } from "@/types";

interface UseTournamentDetailsResult {
  tournament: TournamentDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching tournament details from the API
 * Handles loading states, errors, and provides refetch capability
 * 
 * @param tournamentId - The ID of the tournament to fetch
 * @returns Tournament data, loading state, error state, and refetch function
 */
export function useTournamentDetails(
  tournamentId: string
): UseTournamentDetailsResult {
  const [tournament, setTournament] = useState<TournamentDetailDTO | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournament = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "GET",
        credentials: "include", // Include cookies for authentication
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tournament not found");
        }
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to load tournament");
      }

      const data: TournamentDetailDTO = await response.json();
      setTournament(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching tournament:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  return {
    tournament,
    isLoading,
    error,
    refetch: fetchTournament,
  };
}

