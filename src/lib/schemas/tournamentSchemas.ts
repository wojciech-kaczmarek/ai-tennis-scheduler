import { z } from "zod";

/**
 * Query parameter schema for GET /api/tournaments
 * Validates and applies defaults for pagination and sorting
 */
export const listTournamentsQuerySchema = z.object({
  // Page number (minimum 1)
  page: z.coerce.number().int().min(1).default(1),

  // Items per page (min 1, max 100)
  page_size: z.coerce.number().int().min(1).max(100).default(10),

  // Field to sort by
  sort_by: z.enum(["name", "created_at", "players_count", "courts"]).default("created_at"),

  // Sort direction
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListTournamentsQuery = z.infer<typeof listTournamentsQuerySchema>;
