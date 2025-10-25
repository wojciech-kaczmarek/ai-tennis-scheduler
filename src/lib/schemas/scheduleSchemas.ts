import { z } from "zod";

/**
 * Schema for validating a single match update
 * Validates match_id format and ensures court_number and match_order_on_court are positive integers
 */
export const updateMatchSchema = z.object({
  match_id: z.string().uuid({ message: "Invalid match ID format" }),
  court_number: z.number().int().positive({ message: "Court number must be positive" }),
  match_order_on_court: z.number().int().positive({ message: "Match order must be positive" }),
});

/**
 * Schema for validating the bulk match update request body
 * Ensures updates array is not empty and doesn't exceed 100 items
 */
export const updateScheduleMatchesSchema = z.object({
  updates: z
    .array(updateMatchSchema)
    .min(1, { message: "Updates array cannot be empty" })
    .max(100, { message: "Cannot update more than 100 matches at once" }),
});

/**
 * Schema for validating schedule ID path parameter
 */
export const scheduleIdParamSchema = z.string().uuid({ message: "Invalid schedule ID format" });

