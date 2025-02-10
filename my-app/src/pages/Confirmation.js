import React from 'react';
import { useNavigate } from 'react-router-dom';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Confirmation = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/exam-selection');
  };

  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Check your email</h1>
      <p style={typography.textLgRegular}>
        We've sent a confirmation link to your email address
      </p>
      <button style={styles.button} onClick={handleContinue}>
        Continue →
      </button>
      <p style={typography.textSmRegular}>
        Back to{' '}
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
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: colors.brandPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '20px',
    marginBottom: '20px',
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};

export default Confirmation; 