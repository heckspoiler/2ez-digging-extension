// Public config. The Supabase URL + publishable key are safe to ship in the
// client (same values the frontend uses). Override via .env if needed.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://vfrqsszhigepwyljodaa.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_X3IZJ4GHoanZ5tfGs8AkGg_0KH546-N';
