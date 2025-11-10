import { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

// @E2EPlaywrightTeardown
export default async function globalTeardown(_config: FullConfig) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[E2E teardown] SUPABASE_URL or SUPABASE_KEY is missing. Skipping database cleanup.");
    return;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_USERNAME!,
    password: process.env.E2E_PASSWORD!,
  });

  if (signInError) {
    console.error("Error signing in:", signInError);
    throw signInError;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .delete()
    .ilike("name", "E2E%")
    .select<Pick<TournamentRow, "id">>("id");

  if (error) {
    console.error("[E2E teardown] Failed to clean tournaments table.", error);
    throw error;
  }

  const deletedCount = Array.isArray(data) ? data.length : 0;
  console.info(`[E2E teardown] Removed ${deletedCount} tournament record(s).`);
}
