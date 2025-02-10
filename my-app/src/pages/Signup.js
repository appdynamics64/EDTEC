import React, { useState } from 'react';
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

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Successful signup
      navigate('/confirmation');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      });

      if (error) throw error;
    } catch (error) {
      setError(error.message);
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
      >
        Continue with Google
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