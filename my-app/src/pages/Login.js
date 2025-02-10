import React from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Login = ({ setIsLogin }) => {
  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Login</h1>
      <p style={typography.textLgRegular}>and start practicing</p>
      <input type="email" placeholder="Your email" style={styles.input} />
      <input type="password" placeholder="Password" style={styles.input} />
      <button style={styles.button}>Continue →</button>
      <div style={styles.orContainer}>
        <hr style={styles.hr} />
        <span style={styles.orText}>or</span>
        <hr style={styles.hr} />
      </div>
      <button style={styles.googleButton}>Continue with Google</button>
      <p style={typography.textSmRegular}>
        Don't have an account? <span style={styles.link} onClick={() => setIsLogin(false)}>Signup</span>
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
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
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
  orContainer: {
    display: 'flex',
    alignItems: 'center',
    margin: '10px 0',
  },
  hr: {
    flex: 1,
    border: 'none',
    borderTop: '1px solid #ccc',
  },
  orText: {
    margin: '0 10px',
    color: colors.textSecondary,
  },
  googleButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  link: {
    color: colors.brandPrimary,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};

export default Login; 