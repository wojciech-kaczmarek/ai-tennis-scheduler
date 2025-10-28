import type { APIRoute } from "astro";
import { generateScheduleSchema } from "../../../lib/schemas/generateScheduleSchemas";
import { generateSchedule } from "../../../lib/services/scheduleService";

/**
 * POST /api/schedules/generate
 * Generates a non-persistent schedule preview for tournament planning
 *
 * @requires Authentication - User must be authenticated via Supabase
 * @param {GenerateScheduleRequestDTO} request.body - Tournament configuration
 * @returns {GeneratedScheduleDTO} Generated schedule with matches
 *
 * @throws {401} Unauthorized - When user is not authenticated
 * @throws {400} Bad Request - When request payload validation fails
 * @throws {422} Unprocessable Entity - When business rules are violated
 * @throws {500} Internal Server Error - When schedule generation fails
 */
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Use user from locals (authenticated in middleware)
    const { user } = locals;

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate input using Zod schema
    const validationResult = generateScheduleSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid request payload",
          details: errorMessages,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedData = validationResult.data;

    // Generate schedule using service layer
    const generatedSchedule = await generateSchedule(validatedData);

    return new Response(JSON.stringify(generatedSchedule), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error("Error generating schedule:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while generating the schedule",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
