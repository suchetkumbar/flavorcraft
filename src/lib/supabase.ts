import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client, or null when the env vars aren't set. Without it,
 * FlavorCraft runs fully in the browser and hides account features.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export const accountsEnabled = supabase !== null;
