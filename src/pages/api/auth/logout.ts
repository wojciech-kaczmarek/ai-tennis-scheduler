import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ redirect, locals }) => {
  // Use Supabase instance from locals (created in middleware)
  await locals.supabase.auth.signOut();
  return redirect("/login");
};
