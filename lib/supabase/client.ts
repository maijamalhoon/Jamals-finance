import { createBrowserClient } from '@supabase/ssr'

export const SUPABASE_BROWSER_AUTH_OPTIONS = Object.freeze({
  detectSessionInUrl: false,
} as const)

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser configuration is unavailable.")
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: SUPABASE_BROWSER_AUTH_OPTIONS,
    }
  )
}
