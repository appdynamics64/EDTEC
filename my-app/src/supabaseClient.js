// Remove the direct client creation:
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Instead, re-export from the correct location:
export { supabase } from './config/supabaseClient'; 