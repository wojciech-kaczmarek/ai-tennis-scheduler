import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });
  await supabase.auth.signOut();
  return redirect("/login");
};
