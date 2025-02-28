import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const { score, totalQuestions, attempted, correct, wrong } = location.state || {
    score: 0,
    totalQuestions: 0,
    attempted: 0,
    correct: 0,
    wrong: 0
  };

  const calculatePercentage = () => {
    return totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Test Results</h1>
        
        <div style={styles.scoreSection}>
          <h2 style={styles.scoreLabel}>Your Score</h2>
          <p style={styles.scoreValue}>{calculatePercentage()}%</p>
          <p style={styles.scoreDetail}>({score}/{totalQuestions} points)</p>
        </div>

        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Questions Attempted</span>
            <span style={styles.statValue}>{attempted}/{totalQuestions}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Correct Answers</span>
            <span style={{...styles.statValue, color: colors.success}}>{correct}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Wrong Answers</span>
            <span style={{...styles.statValue, color: colors.error}}>{wrong}</span>
          </div>
        </div>

        <div style={styles.buttonContainer}>
          <button 
            onClick={() => navigate(`/test/${testId}/solutions`)}
            style={styles.solutionButton}
          >
            View Solutions
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={styles.homeButton}
          >
            Back to Dashboard
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
    marginBottom: '40px',
    padding: '24px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '16px',
  },
  scoreLabel: {
    color: colors.textPrimary,
    marginBottom: '8px',
    ...typography.textLgBold,
  },
  scoreValue: {
    color: colors.brandPrimary,
    ...typography.display2XlBold,
    marginBottom: '4px',
  },
  scoreDetail: {
    color: colors.textSecondary,
    ...typography.textMdRegular,
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '40px',
    padding: '24px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '16px',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textPrimary,
    opacity: 0.8,
    ...typography.textLgRegular,
  },
  statValue: {
    color: colors.textPrimary,
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