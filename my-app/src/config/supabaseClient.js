import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    retryAfterError: true,
    timeout: 30000,
    heartbeat: {
      interval: 15000,
      maxRetries: 3
    }
  },
  async onError(err) {
    console.error('Supabase client error:', err);
    if (err.code?.startsWith('42')) {
      console.error('Database error details:', {
        code: err.code,
        message: err.message,
        details: err.details,
        hint: err.hint
      });
    }
    if (err.code === 'connection_lost') {
      await supabase.realtime.connect();
    }
  }
}); 