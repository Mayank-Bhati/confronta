// Supabase browser client — the only client a statically-exported site needs.
// (The @supabase/ssr server client + middleware from the quickstart require a
// Node server; GitHub Pages serves static files, so they are intentionally
// not used here.)
//
// The URL and publishable key are public by design (they identify the project;
// data access is controlled by Row Level Security). Committed defaults keep CI
// builds working; env vars override them.
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://opeplgptrlfptwfyuqlg.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_mLPoEhmclSxDotMw8eiQxA_Hfn69d-h";

let client = null;

export function getSupabase() {
  if (typeof window === "undefined") return null; // static prerender has no browser APIs
  if (!client) client = createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
