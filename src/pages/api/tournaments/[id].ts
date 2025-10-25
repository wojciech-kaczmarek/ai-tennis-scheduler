import type { APIRoute } from "astro";
import { deleteTournamentParamsSchema } from "../../../lib/schemas/tournamentSchemas";
import { deleteTournament } from "../../../lib/services/tournamentService";

/**
 * DELETE /api/tournaments/{id}
 * Deletes a tournament and all associated data (players, schedule, matches)
 *
 * Path Parameters:
 * - id (required): UUID of the tournament to delete
 *
 * Returns:
 * - 204: Tournament deleted successfully (no content)
 * - 400: Invalid tournament ID format
 * - 401: User not authenticated
 * - 404: Tournament not found or user not authorized
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Validate path parameter
    const validation = deleteTournamentParamsSchema.safeParse(params);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid tournament ID format",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validation.data;

    // Step 2: Verify authentication
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Delete tournament via service
    const deleted = await deleteTournament(locals.supabase, id);

    // Step 4: Return appropriate response
    if (!deleted) {
      // Tournament doesn't exist or user doesn't own it
      // Return 404 for both cases (don't reveal existence)
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Tournament not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success - return 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Step 5: Handle unexpected errors
    console.error("Error deleting tournament:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting tournament",
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
