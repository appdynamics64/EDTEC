import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Form validation state
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    name: false
  });

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

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getPasswordStrengthLabel = () => {
    if (password.length === 0) return '';
    
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Moderate';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return colors.accentError;
      case 2:
        return '#f59e0b'; // amber
      case 3:
        return '#10b981'; // emerald
      case 4:
        return '#10b981'; // emerald
      default:
        return colors.textSecondary;
    }
  };

  // Validation helpers
  const isEmailValid = () => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isPasswordValid = () => {
    return password.length >= 8;
  };

  const isConfirmPasswordValid = () => {
    return confirmPassword === password && password.length > 0;
  };

  const isNameValid = () => {
    return name.trim().length >= 2;
  };

  const isFormValid = () => {
    return isEmailValid() && isPasswordValid() && isConfirmPasswordValid() && isNameValid();
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
      name: true
    });
    
    if (!isFormValid()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create user in Supabase Auth
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      // Store user profile in your profiles table
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            { 
              id: user.id, 
              email: email.toLowerCase(),
              name,
              role: 'user'
            }
          ]);
        
        if (profileError) throw profileError;
      }
      
      // Navigate to confirmation page
      navigate('/confirmation', { state: { email } });
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please use a different email or try signing in.');
      } else {
        setError(error.message || 'Failed to create your account. Please try again.');
      }
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
                Start your learning journey with us today
              </p>
              <div style={styles.brandImageContainer}>
                <img 
                  src="/assets/signup-illustration.svg" 
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
              <h2 style={typography.displaySmBold}>Create your account</h2>
              <p style={{...typography.textMdRegular, color: colors.textSecondary, marginTop: '8px'}}>
                Join thousands of students preparing for exams
              </p>
            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSignup} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="name" style={styles.label}>
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  style={{
                    ...styles.input,
                    ...(touched.name && !isNameValid() ? styles.inputError : {})
                  }}
                  placeholder="Your name"
                  disabled={loading}
                  required
                />
                {touched.name && !isNameValid() && (
                  <p style={styles.fieldError}>
                    Name must be at least 2 characters
                  </p>
                )}
              </div>
              
              <div style={styles.formGroup}>
                <label htmlFor="email" style={styles.label}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  style={{
                    ...styles.input,
                    ...(touched.email && !isEmailValid() ? styles.inputError : {})
                  }}
                  placeholder="you@example.com"
                  disabled={loading}
                  required
                />
                {touched.email && !isEmailValid() && (
                  <p style={styles.fieldError}>
                    Please enter a valid email address
                  </p>
                )}
              </div>
              
              <div style={styles.formGroup}>
                <label htmlFor="password" style={styles.label}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  style={{
                    ...styles.input,
                    ...(touched.password && !isPasswordValid() ? styles.inputError : {})
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                {touched.password && !isPasswordValid() && (
                  <p style={styles.fieldError}>
                    Password must be at least 8 characters
                  </p>
                )}
                
                {password.length > 0 && (
                  <div style={styles.passwordStrength}>
                    <div style={styles.passwordStrengthBar}>
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i}
                          style={{
                            ...styles.passwordStrengthSegment,
                            backgroundColor: i < passwordStrength 
                              ? getPasswordStrengthColor() 
                              : colors.backgroundSecondary
                          }}
                        />
                      ))}
                    </div>
                    <span 
                      style={{
                        ...styles.passwordStrengthLabel,
                        color: getPasswordStrengthColor()
                      }}
                    >
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                )}
              </div>
              
              <div style={styles.formGroup}>
                <label htmlFor="confirmPassword" style={styles.label}>
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  style={{
                    ...styles.input,
                    ...(touched.confirmPassword && !isConfirmPasswordValid() ? styles.inputError : {})
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                {touched.confirmPassword && !isConfirmPasswordValid() && (
                  <p style={styles.fieldError}>
                    Passwords do not match
                  </p>
                )}
              </div>
              
              <div style={styles.termsCheck}>
                <p style={typography.textSmRegular}>
                  By creating an account, you agree to our{' '}
                  <a href="/terms" style={styles.link}>Terms of Service</a>{' '}
                  and{' '}
                  <a href="/privacy" style={styles.link}>Privacy Policy</a>
                </p>
              </div>
              
              <button 
                type="submit" 
                style={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            
            <div style={styles.footer}>
              <p style={typography.textMdRegular}>
                Already have an account?{' '}
                <Link to="/login" style={styles.link}>
                  Sign in
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
    overflowY: 'auto',
    maxHeight: '100vh',
    '@media (max-width: 768px)': {
      padding: '16px',
    }
  },
  formContainer: {
    width: '100%',
    maxWidth: '450px',
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
  passwordStrength: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  passwordStrengthBar: {
    flex: 1,
    display: 'flex',
    gap: '4px',
    height: '4px',
  },
  passwordStrengthSegment: {
    flex: 1,
    height: '100%',
    borderRadius: '2px',
    transition: 'background-color 0.2s',
  },
  passwordStrengthLabel: {
    ...typography.textXsRegular,
    minWidth: '60px',
  },
  termsCheck: {
    color: colors.textSecondary,
    fontSize: '14px',
    lineHeight: '1.5',
    marginTop: '8px',
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
};

export default Signup; 