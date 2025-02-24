import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { score, totalQuestions, attempted, correct, wrong } = location.state || {
    score: 20,
    totalQuestions: 300,
    attempted: 40,
    correct: 20,
    wrong: 20
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Test completed</h1>
        
        <div style={styles.scoreSection}>
          <h2 style={styles.scoreLabel}>Score</h2>
          <p style={styles.scoreValue}>{score}/{totalQuestions}</p>
        </div>

        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Attempted:</span>
            <span style={styles.statValue}>{attempted}/{totalQuestions}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Correct:</span>
            <span style={styles.statValue}>{correct}/{totalQuestions}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Wrong:</span>
            <span style={styles.statValue}>{wrong}/{totalQuestions}</span>
          </div>
        </div>

        <div style={styles.buttonContainer}>
          <button 
            onClick={() => navigate('./solutions')}
            style={styles.solutionButton}
          >
            See solution
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={styles.homeButton}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.brandPrimary,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    color: colors.backgroundPrimary,
    marginBottom: '48px',
    ...typography.displayMdBold,
  },
  scoreSection: {
    marginBottom: '32px',
  },
  scoreLabel: {
    color: colors.backgroundPrimary,
    marginBottom: '8px',
    ...typography.displayLgBold,
  },
  scoreValue: {
    color: colors.backgroundPrimary,
    ...typography.displayXlBold,
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '48px',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.backgroundPrimary,
    opacity: 0.8,
    ...typography.textLgRegular,
  },
  statValue: {
    color: colors.backgroundPrimary,
    ...typography.textLgRegular,
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  solutionButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: colors.backgroundPrimary,
    color: colors.brandPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
  homeButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.backgroundPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
};

export default TestResult; 