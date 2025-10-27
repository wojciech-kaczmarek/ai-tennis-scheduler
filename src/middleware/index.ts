import { createSupabaseServerInstance } from "../db/supabase.client";
import { defineMiddleware } from "astro:middleware";

const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      locals.user = {
        email: user.email,
        id: user.id,
      };
    }

    if (user && AUTH_PATHS.includes(url.pathname)) {
      return redirect("/");
    }

    if (!user && !PUBLIC_PATHS.includes(url.pathname)) {
      return redirect("/login");
    }

    return next();
  }
);
