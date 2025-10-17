// ============================================================================
// DTO (Data Transfer Object) and Command Model Type Definitions
// ============================================================================
// This file contains all DTO and Command Model types used for API requests and responses.
// All types are derived from database entity types defined in src/db/database.types.ts

import type { Tables, Enums } from "./db/database.types";

// ============================================================================
// Entity Type Aliases
// ============================================================================
// Direct references to database entity types for clarity and type safety

export type TournamentEntity = Tables<"tournaments">;
export type PlayerEntity = Tables<"players">;
export type ScheduleEntity = Tables<"schedules">;
export type MatchEntity = Tables<"matches">;
export type MatchPlayerEntity = Tables<"match_players">;
export type TournamentType = Enums<"tournament_type">;

// ============================================================================
// Common/Shared DTOs
// ============================================================================

/**
 * Pagination metadata for list responses
 */
export type PaginationDTO = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

// ============================================================================
// GET /api/tournaments - List Tournaments
// ============================================================================

/**
 * Simplified tournament information for list views
 * Derived from TournamentEntity, excluding user_id for client responses
 */
export type TournamentListItemDTO = Pick<
  TournamentEntity,
  "id" | "name" | "type" | "players_count" | "courts" | "created_at"
>;

/**
 * Response payload for GET /api/tournaments
 */
export type TournamentListResponseDTO = {
  data: TournamentListItemDTO[];
  pagination: PaginationDTO;
};

// ============================================================================
// POST /api/tournaments - Create Tournament
// ============================================================================

/**
 * Player input for tournament creation (without database-generated fields)
 * Derived from PlayerEntity Insert type, excluding id and tournament_id
 */
export type CreateTournamentPlayerDTO = Pick<PlayerEntity, "name" | "placeholder_name">;

/**
 * Player reference in a match during tournament creation
 * Uses placeholder_name to identify players before they're persisted
 * team is required for doubles, null for singles
 */
export type CreateTournamentMatchPlayerDTO = {
  placeholder_name: string;
  team: number | null;
};

/**
 * Match definition during tournament creation (without database-generated fields)
 * Derived from MatchEntity, excluding id and schedule_id
 */
export type CreateTournamentMatchDTO = Pick<MatchEntity, "court_number" | "match_order_on_court"> & {
  players: CreateTournamentMatchPlayerDTO[];
};

/**
 * Schedule definition during tournament creation
 * Non-persistent structure that will be saved to database
 */
export type CreateTournamentScheduleDTO = {
  matches: CreateTournamentMatchDTO[];
};

/**
 * Request payload for POST /api/tournaments
 * Combines tournament settings, players list, and pre-generated schedule
 */
export type CreateTournamentRequestDTO = Pick<TournamentEntity, "name" | "type" | "courts"> & {
  players: CreateTournamentPlayerDTO[];
  schedule: CreateTournamentScheduleDTO;
};

/**
 * Response payload for POST /api/tournaments
 * Returns created tournament summary (same as list item)
 */
export type TournamentCreatedResponseDTO = TournamentListItemDTO;

// ============================================================================
// GET /api/tournaments/{id} - Get Tournament Details
// ============================================================================

/**
 * Full player information in tournament details
 * Derived from PlayerEntity, excluding tournament_id
 */
export type PlayerDTO = Pick<PlayerEntity, "id" | "name" | "placeholder_name">;

/**
 * Player information within a match context
 * Combines player data with match-specific team assignment
 * Derived from PlayerEntity and MatchPlayerEntity
 */
export type MatchPlayerDTO = Pick<PlayerEntity, "id" | "name" | "placeholder_name"> & {
  player_id: string;
  team: number | null;
};

/**
 * Full match information with associated players
 * Derived from MatchEntity, excluding schedule_id
 */
export type MatchDTO = Pick<MatchEntity, "id" | "court_number" | "match_order_on_court"> & {
  players: MatchPlayerDTO[];
};

/**
 * Schedule information with all matches
 * Derived from ScheduleEntity, excluding tournament_id
 */
export type ScheduleDTO = Pick<ScheduleEntity, "id"> & {
  matches: MatchDTO[];
};

/**
 * Complete tournament details including players and schedule
 * Derived from TournamentEntity, excluding user_id and players_count
 * (players_count can be derived from players array length)
 */
export type TournamentDetailDTO = Pick<TournamentEntity, "id" | "name" | "type" | "courts" | "created_at"> & {
  players: PlayerDTO[];
  schedule: ScheduleDTO;
};

// ============================================================================
// POST /api/schedules/generate - Generate Schedule Preview
// ============================================================================

/**
 * Player input for schedule generation
 * Same structure as CreateTournamentPlayerDTO (reusable)
 */
export type GenerateSchedulePlayerDTO = CreateTournamentPlayerDTO;

/**
 * Player reference in a generated (non-persisted) match
 * Uses placeholder_name since players aren't persisted yet
 */
export type GenerateScheduleMatchPlayerDTO = {
  placeholder_name: string;
  team: number | null;
};

/**
 * Match structure in a generated (non-persisted) schedule
 * Similar to CreateTournamentMatchDTO but emphasizes it's not yet saved
 */
export type GenerateScheduleMatchDTO = Pick<MatchEntity, "court_number" | "match_order_on_court"> & {
  players: GenerateScheduleMatchPlayerDTO[];
};

/**
 * Request payload for POST /api/schedules/generate
 */
export type GenerateScheduleRequestDTO = {
  type: TournamentType;
  courts: number;
  players: GenerateSchedulePlayerDTO[];
};

/**
 * Response payload for POST /api/schedules/generate
 * Returns generated schedule preview (not persisted to database)
 */
export type GeneratedScheduleDTO = {
  matches: GenerateScheduleMatchDTO[];
};

// ============================================================================
// PATCH /api/schedules/{id}/matches - Update Schedule Matches
// ============================================================================

/**
 * Single match update command
 * Allows updating court assignment and match order
 * Derived from MatchEntity Update type
 */
export type UpdateMatchDTO = Pick<MatchEntity, "id"> & Pick<MatchEntity, "court_number" | "match_order_on_court">;

/**
 * Request payload for PATCH /api/schedules/{id}/matches
 * Allows bulk updates to multiple matches in a single transaction
 */
export type UpdateScheduleMatchesRequestDTO = {
  updates: UpdateMatchDTO[];
};

/**
 * Response payload for PATCH /api/schedules/{id}/matches
 * Returns the schedule ID and list of successfully updated match IDs
 */
export type UpdateScheduleMatchesResponseDTO = {
  schedule_id: string;
  updated_matches: string[];
};
