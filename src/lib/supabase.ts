/**
 * Supabase Client Utility
 *
 * Centralized Supabase client creation with proper error handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client instance (singleton)
 * Returns null if Supabase is not configured (e.g., during build)
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Return cached client if available
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Return null if not configured (e.g., during build time)
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Configuration missing - Supabase features disabled');
    return null;
  }

  // Create and cache client
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
