/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client.ts";

interface User {
  email?: string;
  id: string;
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user?: User;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
