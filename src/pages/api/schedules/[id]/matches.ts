import type { APIRoute } from "astro";
import { updateScheduleMatchesSchema, scheduleIdParamSchema } from "../../../../lib/schemas/scheduleSchemas";
import { updateScheduleMatches } from "../../../../lib/services/scheduleService";
import type { UpdateMatchDTO } from "../../../../types";

export const prerender = false;

/**
 * PATCH /api/schedules/{id}/matches
 * Updates court assignments and match order for multiple matches in a schedule
 *
 * @param params - Path parameters including schedule ID
 * @param request - Request object containing the update payload
 * @param locals - Astro locals with Supabase client
 * @returns JSON response with updated schedule information or error details
 *
 * Status Codes:
 * - 200: Successfully updated matches
 * - 400: Invalid input (bad UUID, validation errors, business rule violations)
 * - 401: User not authenticated
 * - 404: Schedule not found or user doesn't own the tournament
 * - 409: Scheduling conflict detected
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Validate schedule ID from path parameter
    const scheduleIdResult = scheduleIdParamSchema.safeParse(params.id);
    if (!scheduleIdResult.success) {
      return new Response(JSON.stringify({ error: "Invalid schedule ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validationResult = updateScheduleMatchesSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(JSON.stringify({ error: firstError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Call service to update matches
    const result = await updateScheduleMatches(locals.supabase, {
      scheduleId: scheduleIdResult.data,
      userId: user.id,
      updates: validationResult.data.updates as UpdateMatchDTO[],
    });

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating schedule matches:", error);

    // Handle specific error types
    if (error instanceof Error) {
      // Schedule not found or authorization failure
      if (error.message === "Schedule not found") {
        return new Response(JSON.stringify({ error: "Schedule not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Conflict errors
      if (error.message.startsWith("Conflict:")) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validation errors
      if (
        error.message.includes("Invalid court_number") ||
        error.message.includes("Duplicate match ID") ||
        error.message.includes("does not belong to schedule")
      ) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Generic server error
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
