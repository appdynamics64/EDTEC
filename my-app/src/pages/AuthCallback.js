import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // First, check for error in URL hash
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const errorParam = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (errorParam === 'access_denied' && hashParams.get('error_code') === 'otp_expired') {
      setError('Your verification link has expired. Please request a new one.');
      setLoading(false);
      // Try to get the email from localStorage for resending
      const storedEmail = localStorage.getItem('pendingVerificationEmail');
      if (storedEmail) setEmail(storedEmail);
      return;
    }

    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError('Unable to verify your email. Please try again.');
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Update user profile with verification status and login time
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              email_verified: true,
              last_login: new Date().toISOString() 
            })
            .eq('id', session.user.id);

          if (updateError) {
            console.error('Error updating user status:', updateError);
            // Try to create the user profile if it doesn't exist
            const { data: userExists } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single();
            
            if (!userExists) {
              // Create user profile if it doesn't exist
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.name || 'User',
                  role: 'user',
                  email_verified: true,
                  is_new_user: true,
                  created_at: new Date().toISOString(),
                  last_login: new Date().toISOString()
                });
                
              if (insertError) {
                console.error('Error creating user profile:', insertError);
                setError('Failed to complete signup. Please contact support.');
                setLoading(false);
                return;
              }
            } else {
              // If update failed but user exists, show a less severe error
              console.error('Failed to update user verification status');
            }
          }

          // Clear verification data from localStorage
          localStorage.removeItem('pendingVerificationEmail');
          localStorage.removeItem('signupTimestamp');

          // Redirect new users to exam selection instead of dashboard
          navigate('/exam-selection-onboarding');
        } else {
          setError('Verification failed. Please try again.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    if (!errorParam) {
      handleAuthCallback();
    }
  }, [navigate, location.hash]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address to resend the verification link.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      localStorage.setItem('pendingVerificationEmail', email);
      localStorage.setItem('signupTimestamp', Date.now().toString());
      
      navigate('/confirmation', { replace: true });
    } catch (error) {
      console.error('Error resending verification:', error);
      setError(`Failed to resend verification email: ${error.message}`);
      setLoading(false);
    }
  };

  if (loading && !error) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <h2 style={typography.textLgBold}>Verifying your email...</h2>
          <p style={typography.textMdRegular}>Please wait while we complete the verification process.</p>
          <div style={styles.loadingSpinner}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <h2 style={typography.textLgBold}>Verification Error</h2>
          <p style={typography.textMdRegular}>{error}</p>
          
          {error.includes('expired') && (
            <div style={styles.resendForm}>
              <p style={typography.textMdRegular}>
                Enter your email to receive a new verification link:
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                style={styles.emailInput}
              />
              <button 
                onClick={handleResendVerification}
                style={styles.resendButton}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}
          
          <div style={styles.linksContainer}>
            <button 
              onClick={() => navigate('/login')}
              style={styles.linkButton}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: colors.backgroundSecondary || '#f9fafb',
  },
  content: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: colors.backgroundPrimary || 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    width: '100%',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.backgroundSecondary || '#f3f4f6'}`,
    borderTop: `3px solid ${colors.brandPrimary || '#3b82f6'}`,
    borderRadius: '50%',
    margin: '24px auto',
    animation: 'spin 1s linear infinite',
  },
  resendForm: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: colors.backgroundSecondary || '#f3f4f6',
    borderRadius: '8px',
  },
  emailInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: `1px solid ${colors.borderPrimary || '#d1d5db'}`,
    marginBottom: '12px',
    fontSize: '16px',
  },
  resendButton: {
    backgroundColor: colors.brandPrimary || '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
  },
  linksContainer: {
    marginTop: '24px',
  },
  linkButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.brandPrimary || '#3b82f6',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    padding: '8px 16px',
    textDecoration: 'underline',
  },
};

export default AuthCallback; 