import { useState, useEffect, useCallback } from "react";
import type { TournamentListItemDTO, PaginationDTO } from "@/types";
import { listTournaments } from "@/lib/services/tournamentApiClient";

interface UseTournamentsResult {
  data: {
    items: TournamentListItemDTO[];
    pagination: PaginationDTO;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching tournaments with pagination
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 */
export function useTournaments(page: number, pageSize: number): UseTournamentsResult {
  const [data, setData] = useState<{
    items: TournamentListItemDTO[];
    pagination: PaginationDTO;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    // Validate input
    if (page < 1) {
      setError("Page number must be at least 1");
      return;
    }

    if (pageSize < 1 || pageSize > 100) {
      setError("Page size must be between 1 and 100");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listTournaments({
        page,
        page_size: pageSize,
      });

      setData({
        items: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return {
    data,
    loading,
    error,
    refetch: fetchTournaments,
  };
}
