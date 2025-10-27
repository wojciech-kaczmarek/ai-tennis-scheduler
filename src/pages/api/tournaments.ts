import type { APIRoute } from "astro";
import {
  listTournamentsQuerySchema,
  createTournamentSchema,
} from "../../lib/schemas/tournamentSchemas";
import {
  getTournamentsForUser,
  validateTournamentBusinessRules,
  createTournamentWithSchedule,
} from "@/lib/services/tournamentService";
import { createSupabaseServerInstance } from "@/db/supabase.client";

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
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
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
    const result = await getTournamentsForUser(
      supabase,
      user.id,
      validatedQuery
    );

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

/**
 * POST /api/tournaments
 * Creates a complete tournament with players and schedule in a single atomic operation
 *
 * Request Body (JSON):
 * - name (string): Tournament name
 * - type (string): Tournament type ('singles' or 'doubles')
 * - courts (number): Number of available courts
 * - players (array): Array of player objects with name and placeholder_name
 * - schedule (object): Schedule with matches array
 *
 * Returns:
 * - 201: Tournament created successfully with summary
 * - 400: Invalid request payload or malformed JSON
 * - 401: User not authenticated
 * - 422: Business validation failed
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Step 2: Parse request body
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON payload: " + error,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 3: Zod schema validation
  const validationResult = createTournamentSchema.safeParse(requestBody);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request payload",
        details: validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const validatedData = validationResult.data;

  // Step 4: Business rules validation
  const businessErrors = validateTournamentBusinessRules(validatedData);
  if (businessErrors.length > 0) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: businessErrors,
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 5: Create tournament via service
  try {
    const createdTournament = await createTournamentWithSchedule(
      user.id,
      validatedData,
      supabase
    );

    return new Response(JSON.stringify(createdTournament), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/tournaments/${createdTournament.id}`,
      },
    });
  } catch (error) {
    console.error("Tournament creation failed:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create tournament",
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
