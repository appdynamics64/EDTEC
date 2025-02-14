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

      if (activeCategory === 'recommended') {
        query = query.eq('type', 'recommended');
      } else if (activeCategory === 'custom') {
        query = query.eq('type', 'custom');
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span onClick={handleBackClick} style={styles.backButton}>←</span>
        <span style={typography.textLgBold}>All Tests</span>
      </div>

      {/* Categories */}
      <div style={styles.categories}>
        <button 
          style={{
            ...styles.categoryButton,
            ...(activeCategory === 'all' && styles.activeCategoryButton)
          }}
          onClick={() => setActiveCategory('all')}
        >
          All test
        </button>
        <button 
          style={{
            ...styles.categoryButton,
            ...(activeCategory === 'recommended' && styles.activeCategoryButton)
          }}
          onClick={() => setActiveCategory('recommended')}
        >
          Recommended test
        </button>
        <button 
          style={{
            ...styles.categoryButton,
            ...(activeCategory === 'custom' && styles.activeCategoryButton)
          }}
          onClick={() => setActiveCategory('custom')}
        >
          Custom test
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
              <div>
                <h3 style={typography.textLgMedium}>{test.title}</h3>
                <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
                  {test.total_questions} questions · {test.duration}hrs
                </p>
              </div>
              <div style={styles.rightContent}>
                {test.user_tests?.[0]?.status === 'completed' ? (
                  <div style={styles.score}>
                    <span style={styles.checkIcon}>✓</span>
                    Score {test.user_tests[0].score}/{test.total_questions}
                  </div>
                ) : (
                  <span style={styles.arrow}>›</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: colors.backgroundPrimary,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  backButton: {
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textPrimary,
  },
  categories: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  categoryButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1px solid ${colors.brandPrimary}`,
    backgroundColor: 'transparent',
    color: colors.brandPrimary,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  activeCategoryButton: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
  },
  testList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  testItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.backgroundSecondary}`,
    cursor: 'pointer',
  },
  rightContent: {
    display: 'flex',
    alignItems: 'center',
  },
  score: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: colors.accentSuccess,
    ...typography.textSmRegular,
  },
  checkIcon: {
    color: colors.accentSuccess,
  },
  arrow: {
    fontSize: '24px',
    color: colors.textSecondary,
  },
  noTests: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 0',
  },
};

export default AllTests; 