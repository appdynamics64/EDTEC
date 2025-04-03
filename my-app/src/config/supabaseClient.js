import { createClient } from '@supabase/supabase-js';

console.log('supabaseClient.js is being executed');

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('About to create Supabase client with URL:', supabaseUrl);

// Add this at the top of the file
if (window.__SUPABASE_CLIENT_LOADED__) {
  console.warn('supabaseClient.js is being loaded multiple times!');
}
window.__SUPABASE_CLIENT_LOADED__ = true;

// Create a singleton instance
let instance = null;

function getSupabaseClient() {
  if (instance) {
    console.log('Reusing existing Supabase client instance');
    return instance;
  }
  
  console.log('Creating new Supabase client instance');
  
  // Create a new instance
  instance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });
  
  return instance;
}

// Export the singleton instance
export const supabase = getSupabaseClient();

// DO NOT freeze the object - this causes the error
// Object.freeze(supabase); 