import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
  const { email, password } = await request.json();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400 });
  }

  // Use Supabase instance from locals (created in middleware)
  const { supabase } = locals;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  // After successful signup, explicitly set the session if auto-confirm is enabled
  // This ensures cookies are properly set
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
