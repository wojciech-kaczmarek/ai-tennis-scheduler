import type { APIRoute } from "astro";
import { listTournamentsQuerySchema } from "../../lib/schemas/tournamentSchemas";
import { getTournamentsForUser } from "../../lib/services/tournamentService";
import { DEFAULT_USER_ID } from "@/db/supabase.client";

/**
 * GET /api/tournaments
 * Retrieves a paginated, sorted list of tournaments owned by the authenticated user
 *
 * Query Parameters:
 * - page (optional): Page number (default: 1)
 * - page_size (optional): Items per page (default: 10, max: 100)
 * - sort_by (optional): Field to sort by (default: created_at)
 * - order (optional): Sort direction - asc or desc (default: desc)
 *
 * Returns:
 * - 200: Paginated list of tournaments
 * - 400: Invalid query parameters
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const userId = DEFAULT_USER_ID;

    // 2. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get("page") ?? undefined,
      page_size: url.searchParams.get("page_size") ?? undefined,
      sort_by: url.searchParams.get("sort_by") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
    };

    const validation = listTournamentsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid query parameters",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedQuery = validation.data;

    // 3. Call service to fetch tournaments
    const result = await getTournamentsForUser(locals.supabase, userId, validatedQuery);

    // 4. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle unexpected errors
    console.error("Error fetching tournaments:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while fetching tournaments",
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
