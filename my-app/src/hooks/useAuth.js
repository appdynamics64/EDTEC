import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error checking auth session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Call getSession
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isLoading };
};

export default useAuth;