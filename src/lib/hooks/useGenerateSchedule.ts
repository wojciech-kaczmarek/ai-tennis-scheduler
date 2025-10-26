import { useState } from "react";
import type { GenerateScheduleRequestDTO, GeneratedScheduleDTO } from "@/types";

interface UseGenerateScheduleResult {
  loading: boolean;
  error: string | null;
  data: GeneratedScheduleDTO | null;
  generate: (config: GenerateScheduleRequestDTO) => Promise<GeneratedScheduleDTO>;
  reset: () => void;
}

/**
 * Custom hook for generating a tournament schedule
 * Wraps the generate schedule API call with loading and error states
 */
export function useGenerateSchedule(): UseGenerateScheduleResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeneratedScheduleDTO | null>(null);

  const generate = async (config: GenerateScheduleRequestDTO): Promise<GeneratedScheduleDTO> => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
          message: "Failed to generate schedule",
        }));
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
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
    generate,
    reset,
  };
}

