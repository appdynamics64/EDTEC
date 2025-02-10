import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/exam-selection');
      }
    };
    checkSession();
  }, [navigate]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value); // Remove trim() to allow typing
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // First create the user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            email: email
          }
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        // Wait a moment for auth to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Then create the user record
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            name: email.split('@')[0],
            role: 'user'
          });

        if (userError && userError.code !== '23505') { // Ignore duplicate key errors
          console.error('User creation error:', userError);
        }

        navigate('/confirmation');
      } else {
        throw new Error('Failed to create account. Please try again.');
      }

    } catch (error) {
      console.error('Error details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/exam-selection`
        }
      });

      if (error) throw error;

    } catch (error) {
      console.error('Google signup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Create Account</h1>
      <p style={typography.textLgRegular}>and start practicing</p>

      {error && (
        <p style={styles.error}>{error}</p>
      )}

      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Your email"
          style={styles.input}
          value={email}
          onChange={handleEmailChange}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <button 
          style={styles.button}
          disabled={loading}
          type="submit"
        >
          {loading ? 'Creating Account...' : 'Continue →'}
        </button>
      </form>

      <div style={styles.orContainer}>
        <hr style={styles.hr} />
        <span style={styles.orText}>or</span>
        <hr style={styles.hr} />
      </div>

      <button 
        style={styles.googleButton}
        onClick={handleGoogleSignup}
        disabled={loading}
      >
        {loading ? 'Connecting...' : 'Continue with Google'}
      </button>

      <p style={typography.textSmRegular}>
        Already have an account?{' '}
        <span 
          style={styles.link}
          onClick={() => navigate('/')}
        >
          Login
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

export default Signup; 