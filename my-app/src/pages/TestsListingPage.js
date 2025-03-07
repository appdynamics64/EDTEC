import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import useAuth from '../hooks/useAuth';

const TestsListingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTests] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    totalQuestions: 0,
    timeSpent: 0
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user.id]);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select(`
          id,
          name,
          test_description,
          duration_minutes,
          question_count,
          exam:exam_id (
            exam_name,
            exam_description,
            category:category_id (
              name,
              category_description
            )
          )
        `);

      if (error) {
        console.error('Error fetching tests:', error);
        throw error;
      }
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exam_categories')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchRecentTests = useCallback(async () => {
    try {
      if (!user) return;
      
      console.debug('Fetching recent tests for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_tests')
        .select(`
          id,
          status,
          score,
          total_questions,
          time_taken,
          created_at,
          test:test_id (
            id,
            name,
            test_description,
            duration_minutes,
            question_count,
            exam:exam_id (
              exam_name,
              exam_description,
              category:category_id (
                name,
                category_description
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        console.error('Supabase error fetching recent tests:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        setRecentTests([]);
        return;
      }
      
      console.debug('Fetched recent tests:', data?.length || 0);
      setRecentTests(data || []);
      
    } catch (error) {
      console.error('Error fetching recent tests:', error);
      setRecentTests([]);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    try {
      if (!user) return;

      console.debug('Fetching stats for user:', user.id);

      const { data: completedTests, error: completedError } = await supabase
        .from('user_tests')
        .select(`
          id,
          score,
          total_questions,
          time_taken,
          created_at,
          start_time,
          end_time,
          test:test_id (
            name,
            duration_minutes
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (completedError) {
        console.error('Supabase error fetching stats:', {
          code: completedError.code,
          message: completedError.message,
          details: completedError.details
        });
        setStats({
          testsCompleted: 0,
          averageScore: 0,
          totalQuestions: 0,
          timeSpent: 0
        });
        return;
      }

      console.debug('Fetched completed tests:', completedTests?.length || 0);

      const stats = {
        testsCompleted: completedTests?.length || 0,
        averageScore: completedTests?.length 
          ? Math.round(completedTests.reduce((acc, test) => {
              const score = test.score || 0;
              return acc + score;
            }, 0) / completedTests.length)
          : 0,
        totalQuestions: completedTests?.reduce((acc, test) => acc + (test.total_questions || 0), 0) || 0,
        timeSpent: completedTests?.reduce((acc, test) => {
          // Calculate time spent in minutes
          if (test.start_time && test.end_time) {
            const start = new Date(test.start_time);
            const end = new Date(test.end_time);
            return acc + ((end - start) / (1000 * 60));
          }
          return acc + (test.time_taken || 0);
        }, 0) || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        testsCompleted: 0,
        averageScore: 0,
        totalQuestions: 0,
        timeSpent: 0
      });
    }
  }, [user]);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchTests(),
        fetchUserProfile(),
        fetchCategories(),
        fetchRecentTests(),
        fetchStats()
      ]);
    };
    
    initialize();
  }, [fetchTests, fetchUserProfile, fetchCategories, fetchRecentTests, fetchStats]);

  const handleTestClick = async (testId) => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }
      
      // Check for existing in-progress tests
      const { data: existingTests, error: findError } = await supabase
        .from('user_tests')
        .select('id, status, created_at')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });
        
      if (findError) {
        console.error("Error finding user tests:", findError);
      }
      
      // If there are multiple in-progress tests, mark all but the most recent as abandoned
      if (existingTests && existingTests.length > 1) {
        console.log(`Found ${existingTests.length} in-progress tests, cleaning up...`);
        
        for (let i = 1; i < existingTests.length; i++) {
          const { error: updateError } = await supabase
            .from('user_tests')
            .update({ status: 'abandoned' })
            .eq('id', existingTests[i].id);
            
          if (updateError) {
            console.error(`Error abandoning test ${existingTests[i].id}:`, updateError);
          }
        }
      }
      
      // Navigate to the test details page
      navigate(`/test/${testId}`);
    } catch (error) {
      console.error("Error in handleTestClick:", error);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={typography.textMdRegular}>Loading tests...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          ← Back
        </button>
        <h1 style={typography.textXlBold}>Available Tests</h1>
      </div>
      
      {/* Stats Section */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📝</div>
          <div style={styles.statInfo}>
            <p style={typography.textSmRegular}>Tests Completed</p>
            <p style={typography.textLgBold}>{stats.testsCompleted || 0}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🎯</div>
          <div style={styles.statInfo}>
            <p style={typography.textSmRegular}>Average Score</p>
            <p style={typography.textLgBold}>{stats.averageScore}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>❓</div>
          <div style={styles.statInfo}>
            <p style={typography.textSmRegular}>Questions Answered</p>
            <p style={typography.textLgBold}>{stats.totalQuestions}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏱️</div>
          <div style={styles.statInfo}>
            <p style={typography.textSmRegular}>Time Spent</p>
            <p style={typography.textLgBold}>{stats.timeSpent} min</p>
          </div>
        </div>
      </div>
      
      {/* Recent Tests Section */}
      {recentTests.length > 0 && (
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <h2 style={typography.textLgBold}>Recent Tests</h2>
          </div>
          <div style={styles.recentTestsContainer}>
            {recentTests.map(test => {
              const scorePercent = test.score && test.total_questions 
                ? Math.round((test.score / test.total_questions) * 100) 
                : 0;
              
              const scoreColor = scorePercent >= 70 
                ? colors.successDark 
                : scorePercent >= 40 
                  ? colors.warningDark 
                  : colors.errorDark;
                  
              return (
                <div 
                  key={test.id} 
                  style={styles.recentTestCard}
                  onClick={() => navigate(`/test-result/${test.test_id}?user_test_id=${test.id}`)}
                >
                  <div style={styles.recentTestInfo}>
                    <h3 style={typography.textMdBold}>{test.test?.name || 'Untitled Test'}</h3>
                    <p style={typography.textSmRegular}>
                      {new Date(test.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={styles.recentTestScore}>
                    <div style={{
                      ...styles.scoreCircle,
                      backgroundColor: `${scoreColor}20`,
                      color: scoreColor,
                    }}>
                      {scorePercent}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Category Filters */}
      <div style={styles.categoryFilters}>
        <button 
          onClick={() => setActiveCategory('all')}
          style={{
            ...styles.categoryButton,
            ...(activeCategory === 'all' ? styles.activeCategoryButton : {})
          }}
        >
          All
        </button>
        {categories.map(category => (
          <button 
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            style={{
              ...styles.categoryButton,
              ...(activeCategory === category.id ? styles.activeCategoryButton : {})
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Tests Grid */}
      <div style={styles.testsGrid}>
        {tests.length === 0 ? (
          <div style={styles.noTests}>
            <p style={typography.textMdRegular}>No tests available at the moment.</p>
          </div>
        ) : (
          tests.map(test => {
            const userTestsForThisExam = userTests[test.id] || [];
            const inProgressTest = userTestsForThisExam.find(t => t.status === 'in_progress');
            const completedTests = userTestsForThisExam.filter(t => t.status === 'completed');
            
            const bestScore = completedTests.length > 0 
              ? Math.max(...completedTests.map(t => t.score || 0))
              : null;
              
            return (
              <div key={test.id} style={styles.testCard}>
                <div style={styles.testCardContent}>
                  <h2 style={typography.textLgBold}>{test.name}</h2>
                  <p style={typography.textSmRegular}>{test.exam?.exam_name}</p>
                  <p style={typography.textSmRegular}>{test.exam?.exam_description}</p>
                  
                  <div style={styles.testInfo}>
                    <div style={styles.infoItem}>
                      <span style={typography.textSmRegular}>Duration:</span>
                      <span style={typography.textSmBold}>{test.duration_minutes} min</span>
                    </div>
                    
                    {bestScore !== null && (
                      <div style={styles.infoItem}>
                        <span style={typography.textSmRegular}>Best Score:</span>
                        <span style={typography.textSmBold}>{bestScore}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={styles.testStatus}>
                  <div style={styles.statusContainer}>
                    {inProgressTest ? (
                      <>
                        <span style={styles.inProgressBadge}>In Progress</span>
                        <button 
                          style={styles.continueButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/test/${test.id}/questions`);
                          }}
                        >
                          Continue
                        </button>
                      </>
                    ) : completedTests.length > 0 ? (
                      <>
                        <span style={styles.completedBadge}>Completed</span>
                        <button 
                          style={styles.retakeButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestClick(test.id);
                          }}
                        >
                          Retake
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={styles.newBadge}>New</span>
                        <button 
                          style={styles.startButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestClick(test.id);
                          }}
                        >
                          Start
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    minHeight: '100vh',
    backgroundColor: colors.backgroundPrimary,
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '32px',
    gap: '16px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: colors.brandPrimary,
    ...typography.textMdMedium,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    fontSize: '24px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: colors.backgroundPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  recentTestsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  recentTestCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
    },
  },
  recentTestInfo: {
    flex: 1,
  },
  recentTestScore: {
    marginLeft: '16px',
  },
  scoreCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typography.textSmBold,
  },
  categoryFilters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  categoryButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1px solid ${colors.borderPrimary}`,
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
    cursor: 'pointer',
    ...typography.textSmMedium,
    transition: 'all 0.2s',
  },
  activeCategoryButton: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: `1px solid ${colors.brandPrimary}`,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.backgroundSecondary}`,
    borderTop: `3px solid ${colors.brandPrimary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  testsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
  },
  testCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
    },
  },
  testCardContent: {
    padding: '20px',
    flex: 1,
  },
  testInfo: {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    flexWrap: 'wrap',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  testStatus: {
    borderTop: `1px solid ${colors.borderPrimary}`,
    padding: '16px 20px',
    backgroundColor: colors.backgroundPrimary,
  },
  statusContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inProgressBadge: {
    backgroundColor: colors.warningLight,
    color: colors.warningDark,
    padding: '4px 12px',
    borderRadius: '20px',
    ...typography.textXsBold,
  },
  completedBadge: {
    backgroundColor: colors.successLight,
    color: colors.successDark,
    padding: '4px 12px',
    borderRadius: '20px',
    ...typography.textXsBold,
  },
  newBadge: {
    backgroundColor: colors.infoLight,
    color: colors.infoDark,
    padding: '4px 12px',
    borderRadius: '20px',
    ...typography.textXsBold,
  },
  continueButton: {
    backgroundColor: colors.warningDark,
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 16px',
    ...typography.textSmBold,
    cursor: 'pointer',
  },
  retakeButton: {
    backgroundColor: colors.successDark,
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 16px',
    ...typography.textSmBold,
    cursor: 'pointer',
  },
  startButton: {
    backgroundColor: colors.brandPrimary,
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 16px',
    ...typography.textSmBold,
    cursor: 'pointer',
  },
  noTests: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    gridColumn: '1 / -1',
  },
};

export default TestsListingPage; 