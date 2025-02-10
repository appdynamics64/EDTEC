import React from 'react';
import { useNavigate } from 'react-router-dom';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const AllTests = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <span 
          onClick={handleBackClick}
          style={{...styles.backButton, cursor: 'pointer'}}
        >
          ←
        </span>
        <h1 style={{...typography.displaySmBold, color: colors.textPrimary}}>
          All Tests
        </h1>
      </header>

      {/* Test Categories */}
      <div style={styles.testCategories}>
        <button style={{...styles.category, ...styles.activeCategory}}>All test</button>
        <button style={styles.category}>Recommended test</button>
        <button style={styles.category}>Custom test</button>
      </div>

      {/* Test List */}
      <div style={styles.testList}>
        <div style={styles.testItem}>
          <div style={styles.testInfo}>
            <h3 style={typography.textLgMedium}>Custom test 1</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
              100 questions · 2hrs
            </p>
          </div>
          <span style={styles.arrow}>→</span>
        </div>

        <div style={styles.testItem}>
          <div style={styles.testInfo}>
            <h3 style={typography.textLgMedium}>Custom test 2</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
              100 questions · 2hrs
            </p>
          </div>
          <span style={styles.arrow}>→</span>
        </div>

        <div style={styles.testItem}>
          <div style={styles.testInfo}>
            <h3 style={typography.textLgMedium}>Test 2</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
              100 questions · 2hrs
            </p>
          </div>
          <div style={styles.score}>
            <span style={styles.checkIcon}>✓</span>
            Score 20/300
          </div>
        </div>

        <div style={styles.testItem}>
          <div style={styles.testInfo}>
            <h3 style={typography.textLgMedium}>Test 3</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
              100 questions · 2hrs
            </p>
          </div>
          <span style={styles.arrow}>→</span>
        </div>

        <div style={styles.testItem}>
          <div style={styles.testInfo}>
            <h3 style={typography.textLgMedium}>Test 4</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
              100 questions · 2hrs
            </p>
          </div>
          <span style={styles.arrow}>→</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: colors.backgroundPrimary,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  backButton: {
    fontSize: '24px',
    color: colors.textPrimary,
    cursor: 'pointer',
  },
  testCategories: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    overflowX: 'auto',
  },
  category: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1px solid ${colors.borderPrimary}`,
    background: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    color: colors.textPrimary,
    ...typography.textSmMedium,
  },
  activeCategory: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
  },
  testList: {
    display: 'flex',
    flexDirection: 'column',
  },
  testItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.borderPrimary}`,
  },
  testInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  score: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#4CAF50',
    ...typography.textSmMedium,
  },
  checkIcon: {
    color: '#4CAF50',
    fontSize: '16px',
  },
  arrow: {
    color: colors.textSecondary,
    fontSize: '20px',
  },
};

export default AllTests; 