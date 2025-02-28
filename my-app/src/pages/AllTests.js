import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const AllTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchTests();
  }, [activeFilter]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      let query = supabase.from('exam_tests');

      switch (activeFilter) {
        case 'recommended':
          query = query
            .select('*')
            .eq('type', 'recommended');
          break;
        case 'custom':
          query = query
            .select('*')
            .eq('type', 'custom');
          break;
        case 'completed':
          query = query
            .select(`
              *,
              user_tests!inner(
                score,
                status
              )
            `)
            .eq('user_tests.user_id', user.id)
            .eq('user_tests.status', 'completed');
          break;
        default:
          query = query.select('*');
      }

      const { data, error } = await query;
      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'all', label: 'All Tests' },
    { id: 'recommended', label: 'Recommended' },
    { id: 'custom', label: 'Custom Tests' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={styles.backButton}
        >
          ← Back
        </button>
        <h1 style={typography.displayMdBold}>All Tests</h1>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading tests...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <>
          <div style={styles.filters}>
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  ...styles.filterButton,
                  ...(activeFilter === filter.id && styles.activeFilter)
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div style={styles.testGrid}>
            {tests.length === 0 ? (
              <div style={styles.noTests}>
                <p style={typography.textLgRegular}>
                  No {activeFilter} tests found
                </p>
              </div>
            ) : (
              tests.map(test => (
                <div key={test.id} style={styles.testCard}>
                  <div style={styles.testInfo}>
                    <h3 style={typography.textLgMedium}>{test.test_name}</h3>
                    <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
                      {test.total_questions} questions · {test.duration} mins
                    </p>
                    {test.user_tests && (
                      <p style={styles.score}>
                        Score: {test.user_tests[0]?.score}/{test.total_questions}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => navigate(`/test/${test.id}`)}
                    style={styles.startButton}
                  >
                    {test.user_tests ? 'View Result' : 'Start Test'} →
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textMdMedium,
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    overflowX: 'auto',
    padding: '4px',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1px solid ${colors.textSecondary}`,
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ...typography.textSmMedium,
  },
  activeFilter: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
  },
  testGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  testCard: {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: colors.backgroundPrimary,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  testInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  startButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textMdBold,
    alignSelf: 'flex-start',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: colors.textSecondary,
    ...typography.textLgRegular,
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: colors.accentError,
    ...typography.textMdRegular,
  },
  noTests: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: colors.textSecondary,
  },
  score: {
    color: colors.accentSuccess,
    ...typography.textSmMedium,
    marginTop: '4px',
  },
};

export default AllTests; 