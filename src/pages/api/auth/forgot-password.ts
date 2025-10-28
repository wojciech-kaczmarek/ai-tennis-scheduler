import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email } = await request.json();

  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
    });
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${request.headers.get("origin")}/reset-password`,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ message: "Password reset link sent successfully" }), {
    status: 200,
  });
};
