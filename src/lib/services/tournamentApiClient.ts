import type { TournamentListResponseDTO, CreateTournamentRequestDTO, TournamentCreatedResponseDTO } from "@/types";

/**
 * API Client for tournament endpoints
 * Wraps fetch calls with consistent error handling and type safety
 */

interface ListTournamentsParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  order?: "asc" | "desc";
}

/**
 * Fetches a paginated list of tournaments
 * GET /api/tournaments
 */
export async function listTournaments(params: ListTournamentsParams = {}): Promise<TournamentListResponseDTO> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.append("page", params.page.toString());
  if (params.page_size) searchParams.append("page_size", params.page_size.toString());
  if (params.sort_by) searchParams.append("sort_by", params.sort_by);
  if (params.order) searchParams.append("order", params.order);

  const url = `/api/tournaments${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Unknown error",
      message: "Failed to fetch tournaments",
    }));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Creates a new tournament with players and schedule
 * POST /api/tournaments
 */
export async function createTournament(data: CreateTournamentRequestDTO): Promise<TournamentCreatedResponseDTO> {
  const response = await fetch("/api/tournaments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Unknown error",
      message: "Failed to create tournament",
    }));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Deletes a tournament by ID
 * DELETE /api/tournaments/{id}
 */
export async function deleteTournament(id: string): Promise<void> {
  const response = await fetch(`/api/tournaments/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Unknown error",
      message: "Failed to delete tournament",
    }));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }

  // DELETE returns 204 No Content, no need to parse response
}
