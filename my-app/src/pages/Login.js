import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window size for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  // Form validation
  const isEmailValid = () => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isPasswordValid = () => {
    return password.length >= 6;
  };

  const isFormValid = () => {
    return isEmailValid() && isPasswordValid();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe
        }
      });
      
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: 'demo@example.com',
        password: 'demo123456'
      });
      
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Demo login error:', error);
      setError('Demo login failed. Please try regular login instead.');
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

  const isDesktop = windowWidth >= 768;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.container}>
        {isDesktop && (
          <div style={styles.brandSidebar}>
            <div style={styles.brandContent}>
              <h1 style={styles.brandTitle}>EDTEC</h1>
              <p style={styles.brandTagline}>
                Your path to exam success starts here
              </p>
              <div style={styles.brandImageContainer}>
                <img 
                  src="/assets/login-illustration.svg" 
                  alt="Education illustration"
                  style={styles.brandImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div style={styles.formWrapper}>
          <div style={styles.formContainer}>
            <div style={styles.header}>
              {!isDesktop && <h1 style={styles.mobileTitle}>EDTEC</h1>}
              <h2 style={typography.displaySmBold}>Welcome back</h2>
              <p style={{...typography.textMdRegular, color: colors.textSecondary, marginTop: '8px'}}>
                Log in to continue your learning journey
              </p>
            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="email" style={styles.label}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  style={{
                    ...styles.input,
                    ...(emailTouched && !isEmailValid() ? styles.inputError : {})
                  }}
                  placeholder="you@example.com"
                  disabled={loading}
                  required
                />
                {emailTouched && !isEmailValid() && (
                  <p style={styles.fieldError}>
                    Please enter a valid email address
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <div style={styles.labelRow}>
                  <label htmlFor="password" style={styles.label}>
                    Password
                  </label>
                  <Link to="/forgot-password" style={styles.forgotPassword}>
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  style={{
                    ...styles.input,
                    ...(passwordTouched && !isPasswordValid() ? styles.inputError : {})
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                {passwordTouched && !isPasswordValid() && (
                  <p style={styles.fieldError}>
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div style={styles.rememberMeContainer}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={styles.checkbox}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
              </div>
              
              <button 
                type="submit" 
                style={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            
            <div style={styles.divider}>
              <span style={styles.dividerText}>or</span>
            </div>

            <div style={styles.alternateActions}>
              <button 
                onClick={handleDemoLogin}
                style={styles.secondaryButton}
                disabled={loading}
              >
                Try demo account
              </button>
              
              <button 
                onClick={handleGoogleLogin}
                style={styles.googleButton}
                disabled={loading}
              >
                <span style={styles.googleIcon}>G</span>
                Sign in with Google
              </button>
            </div>
            
            <div style={styles.footer}>
              <p style={typography.textMdRegular}>
                Don't have an account?{' '}
                <Link to="/signup" style={styles.link}>
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: colors.backgroundSecondary,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0',
    margin: '0',
    width: '100%',
  },
  container: {
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    minHeight: '100vh',
    margin: '0 auto',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: colors.backgroundPrimary,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      boxShadow: 'none',
      borderRadius: '0',
    }
  },
  brandSidebar: {
    flex: '0 0 45%',
    backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '32px',
  },
  brandContent: {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
  },
  brandTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  brandTagline: {
    fontSize: '18px',
    opacity: '0.9',
    marginBottom: '40px',
  },
  brandImageContainer: {
    width: '100%',
    textAlign: 'center',
  },
  brandImage: {
    maxWidth: '90%',
    height: 'auto',
  },
  mobileTitle: {
    ...typography.displayMdBold,
    color: colors.brandPrimary,
    textAlign: 'center',
    marginBottom: '16px',
  },
  formWrapper: {
    flex: '1 1 55%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: colors.backgroundPrimary,
    '@media (max-width: 768px)': {
      padding: '16px',
    }
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
    padding: '20px',
    '@media (max-width: 480px)': {
      padding: '16px 8px',
    }
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.textSmMedium,
    color: colors.textPrimary,
  },
  input: {
    padding: '14px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.borderDefault}`,
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
    fontSize: '16px',
    width: '100%',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    '&:focus': {
      borderColor: colors.brandPrimary,
      boxShadow: `0 0 0 2px ${colors.brandPrimary}20`,
    }
  },
  inputError: {
    borderColor: colors.accentError,
    '&:focus': {
      boxShadow: `0 0 0 2px ${colors.accentError}20`,
    }
  },
  fieldError: {
    color: colors.accentError,
    ...typography.textSmRegular,
    margin: '4px 0 0',
  },
  rememberMeContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    ...typography.textSmRegular,
    color: colors.textPrimary,
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: colors.brandPrimary,
  },
  submitButton: {
    padding: '14px',
    backgroundColor: colors.brandPrimary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    ...typography.textMdBold,
    transition: 'background-color 0.2s',
    marginTop: '8px',
    '&:hover': {
      backgroundColor: '#3730a3',
    },
    '&:disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    }
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    '&::before, &::after': {
      content: '""',
      flex: '1',
      borderBottom: `1px solid ${colors.borderDefault}`,
    }
  },
  dividerText: {
    ...typography.textSmRegular,
    color: colors.textSecondary,
    padding: '0 10px',
  },
  alternateActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  secondaryButton: {
    padding: '14px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.borderDefault}`,
    borderRadius: '8px',
    cursor: 'pointer',
    ...typography.textMdMedium,
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.textSecondary,
    },
    '&:disabled': {
      opacity: 0.7,
      cursor: 'not-allowed',
    }
  },
  googleButton: {
    padding: '14px',
    backgroundColor: '#ffffff',
    color: colors.textPrimary,
    border: `1px solid ${colors.borderDefault}`,
    borderRadius: '8px',
    cursor: 'pointer',
    ...typography.textMdMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f9fafb',
    },
    '&:disabled': {
      opacity: 0.7,
      cursor: 'not-allowed',
    }
  },
  googleIcon: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    color: '#ffffff',
    borderRadius: '50%',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'none',
    fontWeight: 500,
    '&:hover': {
      textDecoration: 'underline',
    }
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fff5f5',
    color: colors.accentError,
    borderRadius: '8px',
    marginBottom: '24px',
    ...typography.textSmMedium,
    border: `1px solid ${colors.accentError}20`,
  },
  forgotPassword: {
    color: colors.brandPrimary,
    textDecoration: 'none',
    ...typography.textSmMedium,
    '&:hover': {
      textDecoration: 'underline',
    }
  },
};

export default Login; 