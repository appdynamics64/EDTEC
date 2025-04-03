// Server-side Supabase client (if applicable)
import { createClient } from '@supabase/supabase-js';

let serverInstance = null;

export function getServerSupabaseClient() {
  if (!serverInstance) {
    serverInstance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );
  }
  
  return serverInstance;
} 