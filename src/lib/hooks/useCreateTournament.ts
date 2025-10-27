import { useState } from "react";
import type { CreateTournamentRequestDTO, TournamentCreatedResponseDTO } from "@/types";
import { createTournament } from "@/lib/services/tournamentApiClient";

interface UseCreateTournamentResult {
  loading: boolean;
  error: string | null;
  data: TournamentCreatedResponseDTO | null;
  create: (data: CreateTournamentRequestDTO) => Promise<TournamentCreatedResponseDTO>;
  reset: () => void;
}

/**
 * Custom hook for creating a tournament
 * Wraps the createTournament API call with loading and error states
 */
export function useCreateTournament(): UseCreateTournamentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TournamentCreatedResponseDTO | null>(null);

  const create = async (tournamentData: CreateTournamentRequestDTO): Promise<TournamentCreatedResponseDTO> => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await createTournament(tournamentData);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
  };

  return {
    loading,
    error,
    data,
    create,
    reset,
  };
}


