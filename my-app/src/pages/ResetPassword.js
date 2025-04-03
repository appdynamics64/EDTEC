import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check if user has a valid reset token
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Invalid or expired password reset link. Please request a new one.');
      }
    };
    
    checkSession();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      if (error) throw error;
      
      setSuccess(true);
      // Redirect to login after successful password reset
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1 style={styles.title}>Reset Your Password</h1>
        
        {error ? (
          <div style={styles.errorAlert}>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/login')}
              style={styles.secondaryButton}
            >
              Back to Login
            </button>
          </div>
        ) : success ? (
          <div style={styles.successAlert}>
            <p>Your password has been successfully updated!</p>
            <p style={typography.textSmRegular}>
              You will be redirected to the login page in a few seconds...
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <p style={typography.textMdRegular}>
              Enter your new password below.
            </p>
            
            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter new password"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={styles.input}
                placeholder="Confirm new password"
                required
              />
            </div>
            
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: colors.backgroundSecondary,
    padding: '20px',
  },
  formContainer: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '8px',
    padding: '32px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    ...typography.displaySmBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: '24px',
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
    color: colors.textSecondary,
  },
  input: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: `1px solid ${colors.borderPrimary}`,
    fontSize: '16px',
    transition: 'border-color 0.2s',
    outline: 'none',
    ':focus': {
      borderColor: colors.brandPrimary,
    },
  },
  primaryButton: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    cursor: 'pointer',
    ...typography.textMdMedium,
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: colors.brandPrimaryDark,
    },
    ':disabled': {
      backgroundColor: colors.brandPrimaryLight,
      cursor: 'not-allowed',
    },
  },
  secondaryButton: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    cursor: 'pointer',
    ...typography.textMdMedium,
    marginTop: '16px',
  },
  errorAlert: {
    backgroundColor: colors.errorLight,
    color: colors.errorDark,
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px',
    ...typography.textMdMedium,
  },
  successAlert: {
    backgroundColor: colors.successLight,
    color: colors.successDark,
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px',
    ...typography.textMdMedium,
  },
};

export default ResetPassword; 