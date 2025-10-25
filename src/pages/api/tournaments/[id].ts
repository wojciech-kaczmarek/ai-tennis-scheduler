import type { APIRoute } from "astro";
import { getTournamentParamsSchema, deleteTournamentParamsSchema } from "../../../lib/schemas/tournamentSchemas";
import { getTournamentById, deleteTournament } from "../../../lib/services/tournamentService";

/**
 * GET /api/tournaments/{id}
 * Retrieves complete details of a single tournament including players and schedule
 *
 * Path Parameters:
 * - id: Tournament UUID
 *
 * Returns:
 * - 200: Complete tournament details with players and schedule
 * - 400: Invalid tournament ID format
 * - 401: User not authenticated
 * - 404: Tournament not found or user doesn't own it
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Extract and validate path parameter
    const validation = getTournamentParamsSchema.safeParse(params);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid tournament ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validation.data;

    // Step 2: Call service to fetch tournament details
    const tournament = await getTournamentById(locals.supabase, id);

    // Step 3: Return 404 if tournament not found or user doesn't own it
    if (!tournament) {
      return new Response(
        JSON.stringify({
          error: "Tournament not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return successful response with caching headers
    return new Response(JSON.stringify(tournament), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    // Step 5: Handle unexpected errors
    console.error("Error in GET /api/tournaments/[id]:", {
      endpoint: "GET /api/tournaments/[id]",
      tournament_id: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/tournaments/{id}
 * Deletes a tournament and all associated data (players, schedule, matches)
 *
 * Path Parameters:
 * - id: Tournament UUID
 *
 * Returns:
 * - 204: Tournament deleted successfully (no content)
 * - 400: Invalid tournament ID format
 * - 401: User not authenticated
 * - 404: Tournament not found or user doesn't own it
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Extract and validate path parameter
    const validation = deleteTournamentParamsSchema.safeParse(params);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid tournament ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validation.data;

    // Step 2: Call service to delete tournament
    const deleted = await deleteTournament(locals.supabase, id);

    // Step 3: Return 404 if tournament not found or user doesn't own it
    if (!deleted) {
      return new Response(
        JSON.stringify({
          error: "Tournament not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return successful response (204 No Content)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Step 5: Handle unexpected errors
    console.error("Error in DELETE /api/tournaments/[id]:", {
      endpoint: "DELETE /api/tournaments/[id]",
      tournament_id: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
export const prerender = false;
