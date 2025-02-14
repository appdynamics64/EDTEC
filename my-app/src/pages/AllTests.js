import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const AllTests = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, [activeCategory]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('exam_tests')
        .select(`
          *,
          exam:exams(name),
          user_tests(
            score,
            status,
            completed_at
          )
        `);

      // Filter based on category
      if (activeCategory !== 'all') {
        query = query.eq('type', activeCategory);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTests(data);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  const handleTestClick = (testId) => {
    navigate(`/test/${testId}`);
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
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
        <button 
          style={{
            ...styles.category, 
            ...(activeCategory === 'all' && styles.activeCategory)
          }}
          onClick={() => handleCategoryChange('all')}
        >
          All tests
        </button>
        <button 
          style={{
            ...styles.category, 
            ...(activeCategory === 'recommended' && styles.activeCategory)
          }}
          onClick={() => handleCategoryChange('recommended')}
        >
          Recommended
        </button>
        <button 
          style={{
            ...styles.category, 
            ...(activeCategory === 'custom' && styles.activeCategory)
          }}
          onClick={() => handleCategoryChange('custom')}
        >
          Custom
        </button>
      </div>

      {/* Test List */}
      <div style={styles.testList}>
        {loading ? (
          <p style={typography.textMdRegular}>Loading tests...</p>
        ) : tests.length === 0 ? (
          <div style={styles.noTests}>
            <p style={{...typography.textLgRegular, color: colors.textSecondary}}>
              No tests found
            </p>
          </div>
        ) : (
          tests.map((test) => (
            <div 
              key={test.id} 
              style={styles.testItem}
              onClick={() => handleTestClick(test.id)}
            >
              <div style={styles.testInfo}>
                <h3 style={typography.textLgMedium}>
                  {test.title}
                </h3>
                <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
                  {test.total_questions} questions · {test.duration} hrs
                </p>
              </div>
              {test.user_tests?.length > 0 ? (
                <div style={styles.score}>
                  <span style={styles.checkIcon}>✓</span>
                  Score {test.user_tests[0].score}/{test.total_questions}
                </div>
              ) : (
                <span style={styles.arrow}>→</span>
              )}
            </div>
          ))
        )}
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
  noTests: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 0',
    textAlign: 'center',
  },
};

export default AllTests; 