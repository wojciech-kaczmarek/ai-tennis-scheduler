import type { SupabaseClient } from "../../db/supabase.client";
import type { TournamentListItemDTO, TournamentListResponseDTO } from "../../types";
import type { ListTournamentsQuery } from "../schemas/tournamentSchemas";

/**
 * Retrieves a paginated, sorted list of tournaments for a specific user
 *
 * @param supabase - Supabase client instance with user context
 * @param userId - The ID of the authenticated user
 * @param options - Pagination and sorting options
 * @returns Paginated list of tournaments with metadata
 * @throws Error if database query fails
 */
export async function getTournamentsForUser(
  supabase: SupabaseClient,
  userId: string,
  options: ListTournamentsQuery
): Promise<TournamentListResponseDTO> {
  const { page, page_size, sort_by, order } = options;

  // Calculate range for pagination
  const from = (page - 1) * page_size;
  const to = page * page_size - 1;

  // Query tournaments with count
  const { data, count, error } = await supabase
    .from("tournaments")
    .select("id, name, type, players_count, courts, created_at", { count: "exact" })
    .order(sort_by, { ascending: order === "asc" })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch tournaments: ${error.message}`);
  }

  // Calculate pagination metadata
  const total_items = count || 0;
  const total_pages = Math.ceil(total_items / page_size);

  // Map database rows to DTOs (fields already match)
  const tournaments: TournamentListItemDTO[] = data || [];

  return {
    data: tournaments,
    pagination: {
      page,
      page_size,
      total_items,
      total_pages,
    },
  };
}
