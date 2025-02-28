import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, stay on login
        navigate('/login');
      } else {
        // If session exists, go to dashboard
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Successful login
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      // Google OAuth success
      if (data?.user) {
        // Check if user exists in users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select()
          .eq('id', data.user.id)
          .single();

        if (!userData) {
          // Create user record if it doesn't exist
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                role: 'user'
              }
            ]);

          if (insertError) throw insertError;
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add this test function temporarily
  const testSupabase = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Supabase connection test:', { data, error });
    } catch (err) {
      console.error('Supabase test error:', err);
    }
  };

  // Call it when component mounts
  useEffect(() => {
    testSupabase();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Login</h1>
      <p style={typography.textLgRegular}>and start practicing</p>
      
      {error && (
        <p style={styles.error}>{error}</p>
      )}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Your email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button 
          style={styles.button}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Continue →'}
        </button>
      </form>

      <div style={styles.orContainer}>
        <hr style={styles.hr} />
        <span style={styles.orText}>or</span>
        <hr style={styles.hr} />
      </div>

      <button 
        style={styles.googleButton}
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? 'Connecting...' : 'Continue with Google'}
      </button>

      <p style={typography.textSmRegular}>
        Don't have an account?{' '}
        <span 
          style={styles.link}
          onClick={() => navigate('/signup')}
        >
          Signup
        </span>
      </p>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: colors.brandPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  orContainer: {
    display: 'flex',
    alignItems: 'center',
    margin: '10px 0',
  },
  hr: {
    flex: 1,
    border: 'none',
    borderTop: '1px solid #ccc',
  },
  orText: {
    margin: '0 10px',
    color: colors.textSecondary,
  },
  googleButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  error: {
    color: colors.error,
    marginBottom: '10px',
  },
};

export default Login; 