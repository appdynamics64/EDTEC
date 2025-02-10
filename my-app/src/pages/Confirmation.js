import React from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Confirmation = ({ setIsLogin, setShowConfirmation, setShowExamSelection }) => {
  const handleConfirm = () => {
    setShowConfirmation(false); // Hide confirmation
    setShowExamSelection(true); // Show exam selection
  };

  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Check your inbox</h1>
      <p style={typography.textLgRegular}>
        An activation link has been sent to example@xyz.ai. Be sure to look in your spam folder if you don't see it in your inbox.
      </p>
      <p style={typography.textSmRegular}>
        <span style={styles.link} onClick={() => setIsLogin(true)}>← Back to login</span>
      </p>
      <button style={styles.button} onClick={handleConfirm}>Confirm</button>
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
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};

export default Confirmation; 