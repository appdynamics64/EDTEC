// Debug utility to track Supabase client creation
let clientCount = 0;

export function trackSupabaseClient(location) {
  clientCount++;
  console.warn(`Supabase client accessed from ${location} (count: ${clientCount})`);
} 