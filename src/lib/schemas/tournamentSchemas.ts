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

// ============================================================================
// POST /api/tournaments - Create Tournament Schemas
// ============================================================================

/**
 * Player schema for tournament creation
 * Validates player data with optional name and required placeholder_name
 */
const createTournamentPlayerSchema = z.object({
  name: z.string().max(100).nullable(),
  placeholder_name: z.string().min(1).max(50),
});

/**
 * Match player reference schema
 * Validates player references within matches
 */
const createTournamentMatchPlayerSchema = z.object({
  placeholder_name: z.string().min(1).max(50),
  team: z.number().int().min(1).max(2).nullable(),
});

/**
 * Match schema for tournament creation
 * Validates match structure with court assignment and players
 */
const createTournamentMatchSchema = z.object({
  court_number: z.number().int().positive(),
  match_order_on_court: z.number().int().positive(),
  players: z.array(createTournamentMatchPlayerSchema).min(2).max(4),
});

/**
 * Schedule schema for tournament creation
 * Validates schedule structure with matches array
 */
const createTournamentScheduleSchema = z.object({
  matches: z.array(createTournamentMatchSchema).min(1).max(100),
});

/**
 * Main tournament creation schema
 * Validates complete tournament creation request payload
 */
export const createTournamentSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(["singles", "doubles"]),
  courts: z.number().int().min(1).max(6),
  players: z.array(createTournamentPlayerSchema).min(2).max(24),
  schedule: createTournamentScheduleSchema,
});

/**
 * Type inference for tournament creation schema
 */
export type CreateTournamentSchemaType = z.infer<typeof createTournamentSchema>;

// ============================================================================
// DELETE /api/tournaments/{id} - Delete Tournament Schema
// ============================================================================

/**
 * Path parameter schema for DELETE /api/tournaments/{id}
 * Validates tournament ID is a valid UUID
 */
export const deleteTournamentParamsSchema = z.object({
  id: z.string().uuid("Invalid tournament ID format"),
});

/**
 * Type inference for delete tournament path parameters
 */
export type DeleteTournamentParams = z.infer<typeof deleteTournamentParamsSchema>;

// ============================================================================
// GET /api/tournaments/{id} - Get Tournament Details Schema
// ============================================================================

/**
 * Path parameter schema for GET /api/tournaments/{id}
 * Validates tournament ID is a valid UUID
 */
export const getTournamentParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid tournament ID format" }),
});

/**
 * Type inference for get tournament path parameters
 */
export type GetTournamentParams = z.infer<typeof getTournamentParamsSchema>;
