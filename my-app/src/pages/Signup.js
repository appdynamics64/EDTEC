import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import styled from 'styled-components';
import { AuthRetryableFetchError } from '@supabase/supabase-js';

const Signup = () => {
  const navigate = useNavigate();
  
  // Define state variables - using the formData approach for better organization
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkRetries, setNetworkRetries] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Form validation state
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
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
    if (!formData.password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    // Length check
    if (formData.password.length >= 8) strength += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(formData.password)) strength += 1;
    if (/[0-9]/.test(formData.password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getPasswordStrengthLabel = () => {
    if (formData.password.length === 0) return '';
    
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
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  };

  const isPasswordValid = () => {
    return formData.password.length >= 8;
  };

  const isConfirmPasswordValid = () => {
    return formData.confirmPassword === formData.password && formData.password.length > 0;
  };

  const isFormValid = () => {
    return isEmailValid() && isPasswordValid() && isConfirmPasswordValid();
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setNetworkRetries(0);
      
      // Validate form inputs
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('All fields are required');
        return;
      }
      
      // Check if passwords match
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Password strength validation
      if (passwordStrength < 2) {
        setError('Please choose a stronger password');
        return;
      }

      // First - check if we can reach Supabase at all
      try {
        // Simple ping to check connectivity
        await fetch(process.env.REACT_APP_SUPABASE_URL || 'https://api.supabase.io', { 
          method: 'HEAD',
          mode: 'no-cors', // This allows us to check connectivity without CORS issues
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
      } catch (pingError) {
        console.error('Cannot reach Supabase:', pingError);
        setError('Cannot connect to our servers. Please check your internet connection and try again.');
        return;
      }

      // Implement a retry mechanism with maximum 3 attempts and increasing delay
      const maxRetries = 3;
      let attempt = 0;
      let success = false;

      while (!success && attempt < maxRetries) {
        try {
          attempt++;
          if (attempt > 1) {
            setNetworkRetries(attempt - 1);
            // Exponential backoff - wait longer between each retry
            const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          // Create auth user with timeout
          const signupPromise = supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                name: formData.name
              }
            }
          });
          
          // Add timeout to prevent hanging indefinitely
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), 10000); // 10s timeout
          });
          
          // Race the signup against the timeout
          const { data, error: authError } = await Promise.race([
            signupPromise,
            timeoutPromise
          ]);
          
          if (authError) throw authError;
          
          // If we got here, the auth request succeeded
          success = true;
          
          if (data?.user) {
            // Create user profile in profiles table
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  name: formData.name,
                  role: 'user'
                });
              
              if (profileError) {
                console.error('Profile creation error:', profileError);
                // Continue even if profile creation fails - the auth worked
              }
            } catch (profileErr) {
              console.error('Failed to create profile but auth succeeded:', profileErr);
              // Continue even if profile creation fails
            }
            
            // Redirect to login page with success message
            navigate('/login', { 
              state: { message: 'Signup successful! Please check your email to verify your account.' } 
            });
          }
        } catch (retryError) {
          console.error(`Signup attempt ${attempt} failed:`, retryError);
          
          // Only retry for network-related errors
          const isNetworkError = 
            retryError.message?.includes('Load failed') || 
            retryError.message?.includes('network') ||
            retryError.message?.includes('connection') || 
            retryError.message?.includes('timeout') ||
            retryError instanceof AuthRetryableFetchError;
          
          if (isNetworkError) {
            if (attempt >= maxRetries) {
              throw new Error('Network connection failed after multiple attempts. Please try again later.');
            }
            // Otherwise continue the loop for another retry
          } else {
            throw retryError; // Non-network error, don't retry
          }
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      // More detailed error handling
      if (error.message?.includes('network') || 
          error.message?.includes('connection') || 
          error.message?.includes('Load failed') ||
          error.message?.includes('timeout') ||
          error instanceof AuthRetryableFetchError) {
        setError('Network connection error. Please check your internet connection and try again later.');
      } else if (error.message?.includes('already registered')) {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.message?.includes('password')) {
        setError('Password error: ' + error.message);
      } else {
        setError(error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
      setNetworkRetries(0);
    }
  };

  const isDesktop = windowWidth >= 768;

  return (
    <Container>
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
            
            {networkRetries > 0 && !error && (
              <RetryMessage>
                Connection issue detected. Retry attempt {networkRetries}/3...
              </RetryMessage>
            )}
            
            <Form onSubmit={handleSignup} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="name" style={styles.label}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  style={{
                    ...styles.input,
                    ...(touched.name && !formData.name ? styles.inputError : {})
                  }}
                  placeholder="John Doe"
                  disabled={loading}
                  required
                />
                {touched.name && !formData.name && (
                  <p style={styles.fieldError}>
                    Please enter your full name
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
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
                
                {formData.password.length > 0 && (
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
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
            </Form>
            
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
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: ${colors.backgroundSecondary};
`;

const FormContainer = styled.div`
  background-color: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 480px;
  
  h1 {
    ${typography.headingLg};
    margin-bottom: 24px;
    color: ${colors.textPrimary};
    text-align: center;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid ${colors.borderPrimary};
  border-radius: 8px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
    box-shadow: 0 0 0 3px ${colors.brandPrimary}30;
  }
`;

const Button = styled.button`
  background-color: ${colors.brandPrimary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${colors.brandPrimaryDark || '#3949ab'};
  }
  
  &:disabled {
    background-color: ${colors.backgroundDisabled || '#c5c5c5'};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${colors.backgroundError || '#fdeded'};
  color: ${colors.accentError || '#d32f2f'};
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  ${typography.textSmMedium};
`;

const RetryMessage = styled.div`
  background-color: ${colors.backgroundWarning || '#fff8e1'};
  color: ${colors.accentWarning || '#f57c00'};
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  ${typography.textSmMedium};
`;

const LoginLink = styled.div`
  text-align: center;
  margin-top: 24px;
  ${typography.textSmRegular};
  color: ${colors.textSecondary};
  
  a {
    color: ${colors.brandPrimary};
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const styles = {
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