import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=Unable to verify email');
        return;
      }

      if (session?.user) {
        try {
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
          }

          // Clear verification data from localStorage
          localStorage.removeItem('pendingVerificationEmail');
          localStorage.removeItem('signupTimestamp');

          // Redirect to dashboard
          navigate('/dashboard');
        } catch (error) {
          console.error('Profile update error:', error);
          navigate('/dashboard'); // Still redirect to dashboard even if update fails
        }
      } else {
        navigate('/login?error=Verification failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h2>Verifying your email...</h2>
        <p>Please wait while we complete the verification process.</p>
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
    backgroundColor: '#f9fafb',
  },
  content: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
};

export default AuthCallback; 