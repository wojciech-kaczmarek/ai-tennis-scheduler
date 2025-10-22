import { z } from "zod";

/**
 * Player schema for schedule generation
 * Validates player data with optional name and required placeholder_name
 */
const generateSchedulePlayerSchema = z.object({
  name: z.string().max(100).nullable(),
  placeholder_name: z.string().min(1).max(50),
});

/**
 * Schedule generation request schema
 * Validates the request payload for generating a schedule preview
 */
export const generateScheduleSchema = z
  .object({
    type: z.enum(["singles", "doubles"]),
    courts: z.number().int().min(1).max(6),
    players: z.array(generateSchedulePlayerSchema).min(2).max(24),
  })
  .refine(
    (data) => {
      // Singles: minimum 2 players
      if (data.type === "singles") {
        return data.players.length >= 2;
      }
      // Doubles: minimum 4 players (must be even for team pairing)
      if (data.type === "doubles") {
        return data.players.length >= 4 && data.players.length % 2 === 0;
      }
      return true;
    },
    {
      message: "Singles requires at least 2 players. Doubles requires at least 4 players and an even number.",
      path: ["players"],
    }
  )
  .refine(
    (data) => {
      // Validate placeholder_name uniqueness
      const placeholderNames = data.players.map((p) => p.placeholder_name);
      return new Set(placeholderNames).size === placeholderNames.length;
    },
    {
      message: "Each player must have a unique placeholder_name",
      path: ["players"],
    }
  );

/**
 * Type inference for schedule generation schema
 */
export type GenerateScheduleSchemaType = z.infer<typeof generateScheduleSchema>;
