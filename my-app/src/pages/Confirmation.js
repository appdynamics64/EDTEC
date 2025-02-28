import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Confirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [timer, setTimer] = useState(60);
  const [emailSent, setEmailSent] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window size for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle redirect if user navigated here directly without an email
  useEffect(() => {
    if (!email && !location.state?.email) {
      navigate('/signup');
    }
  }, [email, location.state, navigate]);

  // Countdown timer for resend email
  useEffect(() => {
    if (emailSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [emailSent, timer]);

  // Check if user has already confirmed 
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };
    
    const interval = setInterval(checkUserStatus, 3000);
    checkUserStatus();
    
    return () => clearInterval(interval);
  }, [navigate]);

  const handleResendEmail = async () => {
    if (timer > 0 && emailSent) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      
      if (error) throw error;
      
      setSuccess('Confirmation email sent! Please check your inbox and spam folder.');
      setEmailSent(true);
      setTimer(60);
    } catch (error) {
      console.error('Error resending email:', error);
      setError(error.message || 'Failed to resend confirmation email');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simply attempt to refresh the session
      await supabase.auth.refreshSession();
      
      // Get updated session to check if email is confirmed
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        navigate('/dashboard');
      } else {
        setError('Email not confirmed yet. Please check your inbox and spam folder.');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setError(error.message || 'Failed to verify email status');
    } finally {
      setLoading(false);
    }
  };

  const isDesktop = windowWidth >= 768;

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.contentContainer}>
        {isDesktop && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarContent}>
              <h1 style={styles.logoText}>EDTEC</h1>
              <p style={styles.tagline}>
                Almost there! Verify your email to continue
              </p>
            </div>
          </div>
        )}

        <div style={styles.mainContent}>
          <div style={styles.formContainer}>
            {!isDesktop && <h1 style={styles.mobileLogoText}>EDTEC</h1>}
            
            <div style={styles.card}>
              <div style={styles.iconWrapper}>
                <span style={styles.icon}>✉️</span>
              </div>
              
              <h2 style={styles.heading}>Check your email</h2>
              
              <p style={styles.emailSentText}>
                We sent a confirmation link to <strong>{email}</strong>
              </p>
              
              {error && (
                <div style={styles.errorMessage}>
                  {error}
                </div>
              )}
              
              {success && (
                <div style={styles.successMessage}>
                  {success}
                </div>
              )}
              
              <div style={styles.instructions}>
                <p style={styles.instructionText}>
                  Please check your email and click the confirmation link to activate your account. 
                  If you don't see the email, check your spam folder.
                </p>
              </div>
              
              <div style={styles.buttonGroup}>
                <button 
                  onClick={handleManualVerify}
                  style={loading ? styles.buttonPrimaryDisabled : styles.buttonPrimary}
                  disabled={loading}
                >
                  {loading ? 'Checking...' : "I've confirmed my email"}
                </button>
                
                <button 
                  onClick={handleResendEmail}
                  style={(loading || (timer > 0 && emailSent)) 
                    ? styles.buttonSecondaryDisabled 
                    : styles.buttonSecondary}
                  disabled={loading || (timer > 0 && emailSent)}
                >
                  {timer > 0 && emailSent
                    ? `Resend email (${timer}s)`
                    : 'Resend confirmation email'
                  }
                </button>
              </div>
              
              <div style={styles.footer}>
                <Link to="/login" style={styles.link}>
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',  // Lighter, cleaner background
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    width: '100%',
  },
  contentContainer: {
    display: 'flex',
    width: '100%',
    maxWidth: '1000px',
    minHeight: '560px',
    margin: '0 auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: colors.backgroundPrimary,
  },
  sidebar: {
    width: '45%',
    background: 'linear-gradient(145deg, #4f46e5 0%, #5f43ce 100%)',  // More dimensional gradient
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '40px',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarContent: {
    maxWidth: '360px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 2,
  },
  logoText: {
    fontSize: '38px',
    fontWeight: 'bold',
    marginBottom: '20px',
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: '20px',
    lineHeight: '1.5',
    opacity: '0.95',
    marginBottom: '40px',
    fontWeight: '400',
  },
  mobileLogoText: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: colors.brandPrimary,
    textAlign: 'center',
    marginBottom: '28px',
    letterSpacing: '-0.5px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    backgroundColor: colors.backgroundPrimary,
  },
  formContainer: {
    width: '100%',
    maxWidth: '360px',
  },
  card: {
    backgroundColor: colors.backgroundPrimary,
    padding: '32px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '18px',
    border: 'none',  // Remove border for cleaner look
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  icon: {
    fontSize: '36px',
  },
  heading: {
    ...typography.displayXsBold,
    color: colors.textPrimary,
    marginBottom: '4px',
  },
  emailSentText: {
    ...typography.textMdRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: '8px',
  },
  instructions: {
    textAlign: 'center',
    width: '100%',
    marginTop: '8px',
  },
  instructionText: {
    ...typography.textSmRegular,
    color: colors.textSecondary,
    lineHeight: '1.6',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    width: '100%',
    marginTop: '24px',
  },
  buttonPrimary: {
    padding: '14px 20px',
    backgroundColor: colors.brandPrimary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    ...typography.textMdBold,
    width: '100%',
    transition: 'transform 0.1s, background-color 0.2s',
  },
  buttonPrimaryDisabled: {
    padding: '14px 20px',
    backgroundColor: '#a5b4fc',  // Lighter, more on-brand disabled color
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'not-allowed',
    ...typography.textMdBold,
    width: '100%',
  },
  buttonSecondary: {
    padding: '14px 20px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid #e2e8f0`,  // Refined border color
    borderRadius: '10px',
    cursor: 'pointer',
    ...typography.textMdRegular,
    width: '100%',
    transition: 'background-color 0.2s',
  },
  buttonSecondaryDisabled: {
    padding: '14px 20px',
    backgroundColor: 'transparent',
    color: '#94a3b8',  // More refined disabled text color
    border: `1px solid #e2e8f0`,
    borderRadius: '10px',
    cursor: 'not-allowed',
    opacity: 0.8,
    ...typography.textMdRegular,
    width: '100%',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'none',
    fontWeight: 500,
    padding: '6px 10px',  // Increase hit area
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  errorMessage: {
    padding: '14px 16px',
    backgroundColor: '#fff5f5',
    color: colors.accentError,
    borderRadius: '10px',
    ...typography.textSmMedium,
    width: '100%',
    border: `1px solid rgba(239, 68, 68, 0.15)`,
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
  },
  successMessage: {
    padding: '14px 16px',
    backgroundColor: '#f0fdf4',
    color: '#047857',
    borderRadius: '10px',
    ...typography.textSmMedium,
    width: '100%',
    border: `1px solid rgba(16, 185, 129, 0.15)`,
    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
  },
};

export default Confirmation; 