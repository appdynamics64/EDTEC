import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Confirmation = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    const signupTimestamp = localStorage.getItem('signupTimestamp');

    if (!storedEmail) {
      navigate('/signup');
      return;
    }

    setEmail(storedEmail);

    // Check if user is already verified
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        navigate('/dashboard');
      }
    };

    checkVerification();

    // Set up resend cooldown
    if (signupTimestamp) {
      const updateTimeRemaining = () => {
        const elapsed = Date.now() - parseInt(signupTimestamp);
        const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
        setTimeRemaining(remaining);
        setResendDisabled(remaining > 0);
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [navigate]);

  const handleResendEmail = async () => {
    if (resendDisabled) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      setResendMessage('Verification email resent successfully!');
      localStorage.setItem('signupTimestamp', Date.now().toString());
      setResendDisabled(true);
      setTimeRemaining(60);
    } catch (error) {
      console.error('Error resending email:', error);
      setResendMessage('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Check your email</h1>
        <p style={styles.description}>
          We sent a verification link to <strong>{email}</strong>
        </p>
        <p style={styles.instruction}>
          Click the link in the email to verify your account and complete the signup process.
        </p>

        <div style={styles.resendSection}>
          <p style={styles.resendText}>Didn't receive the email?</p>
          <button
            onClick={handleResendEmail}
            disabled={resendDisabled}
            style={{
              ...styles.resendButton,
              ...(resendDisabled ? styles.resendButtonDisabled : {})
            }}
          >
            {resendDisabled 
              ? `Resend available in ${timeRemaining}s` 
              : 'Resend verification email'}
          </button>
          {resendMessage && (
            <p style={styles.message}>{resendMessage}</p>
          )}
        </div>

        <div style={styles.footer}>
          <Link to="/login" style={styles.link}>
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: colors.backgroundSecondary,
  },
  card: {
    backgroundColor: colors.backgroundPrimary,
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    ...typography.displaySmBold,
    marginBottom: '16px',
    color: colors.textPrimary,
  },
  description: {
    ...typography.textMdRegular,
    color: colors.textSecondary,
    marginBottom: '24px',
  },
  instruction: {
    ...typography.textMdRegular,
    color: colors.textSecondary,
    marginBottom: '32px',
  },
  resendSection: {
    marginTop: '32px',
  },
  resendText: {
    ...typography.textSmRegular,
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  resendButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.brandPrimary,
    cursor: 'pointer',
    ...typography.textMdMedium,
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: colors.brandPrimary + '10',
    },
  },
  resendButtonDisabled: {
    color: colors.textSecondary,
    cursor: 'not-allowed',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  message: {
    ...typography.textSmRegular,
    marginTop: '8px',
    color: colors.textSecondary,
  },
  footer: {
    marginTop: '40px',
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'none',
    ...typography.textMdMedium,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
};

export default Confirmation; 