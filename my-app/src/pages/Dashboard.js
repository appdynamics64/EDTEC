import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(null);
  const [userExam, setUserExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      // Get current user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      // Get user details from your users table
      const { data, error } = await supabase
        .from('users')
        .select('name, selected_exam')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setUserName(data.name);
        setUserExam(data.selected_exam);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeeAllClick = () => {
    navigate('/all-tests');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <header style={styles.header}>
        <div style={styles.greetingSection}>
          <div style={styles.timeGreeting}>
            <span>☀️</span>
            <span style={typography.textSmRegular}>GOOD MORNING</span>
          </div>
          {userName && (
            <h1 style={typography.displayMdBold}>{userName}</h1>
          )}
          <div style={styles.examSelector}>
            <span style={typography.textSmRegular}>
              Exam: {userExam || 'Not Selected'}
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.profileAvatar} />
          <button 
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Action Buttons */}
      <div style={styles.actionButtons}>
        <button style={{...styles.actionButton, ...styles.customTestBtn}}>
          <span>+</span>
          <span style={typography.textLgMedium}>Create a custom test</span>
          <span>🎯</span>
        </button>
        <button style={{...styles.actionButton, ...styles.randomTestBtn}}>
          <span>+</span>
          <span style={typography.textLgMedium}>Create a random test</span>
          <span>🎲</span>
        </button>
      </div>

      {/* Tests Section */}
      <section style={styles.testsSection}>
        <div style={styles.testsHeader}>
          <h2 style={typography.textXlBold}>All Tests</h2>
          <span 
            onClick={handleSeeAllClick}
            style={{
              ...typography.textSmMedium, 
              color: colors.brandPrimary,
              cursor: 'pointer'
            }}
          >
            See all
          </span>
        </div>

        {/* Test Categories */}
        <div style={styles.testCategories}>
          <button style={{...styles.category, ...styles.activeCategory}}>All test</button>
          <button style={styles.category}>Recommended test</button>
          <button style={styles.category}>Custom test</button>
        </div>

        {/* Test List */}
        <div style={styles.testList}>
          {[1, 2, 3, 4].map((num, index) => (
            <div key={num} style={styles.testItem}>
              <div style={styles.testInfo}>
                <h3 style={typography.textLgMedium}>Test {num}</h3>
                <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
                  100 questions · 2hrs
                </p>
              </div>
              {index === 1 ? (
                <div style={styles.score}>Score 20/300</div>
              ) : (
                <span style={styles.arrow}>→</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: colors.brandPrimary,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    color: colors.backgroundPrimary,
    marginBottom: '30px',
  },
  greetingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  timeGreeting: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  examSelector: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '6px 12px',
    borderRadius: '20px',
    display: 'inline-block',
  },
  profileAvatar: {
    width: '48px',
    height: '48px',
    backgroundColor: '#FFA26B',
    borderRadius: '50%',
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '30px',
  },
  actionButton: {
    padding: '20px',
    borderRadius: '16px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  customTestBtn: {
    backgroundColor: '#FFE7E7',
    color: '#FF5C5C',
  },
  randomTestBtn: {
    backgroundColor: '#E7E7FF',
    color: colors.brandPrimary,
  },
  testsSection: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '24px 24px 0 0',
    padding: '20px',
    minHeight: '400px',
  },
  testsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
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
    border: '1px solid #E0E0E0',
    background: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  activeCategory: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
  },
  testList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  testItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #E0E0E0',
  },
  testInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  score: {
    color: '#4CAF50',
    ...typography.textSmMedium,
  },
  arrow: {
    color: colors.textSecondary,
    fontSize: '20px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    }
  },
};

export default Dashboard; 