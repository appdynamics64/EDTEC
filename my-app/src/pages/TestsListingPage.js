import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestsListingPage = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTests, setUserTests] = useState({});
  const [userName, setUserName] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    totalQuestions: 0,
    timeSpent: 0
  });

  useEffect(() => {
    fetchUserProfile();
    fetchTests();
    fetchCategories();
    fetchRecentTests();
    fetchStats();
  }, [activeCategory]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUserName('User');
        return;
      }
      
      if (data) {
        setUserName(data.name || 'User');
      } else {
        setUserName('User');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserName('User');
    }
  };

  const fetchCategories = async () => {
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
  };

  const fetchRecentTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_tests')
        .select(`
          *,
          exam_tests (
            title,
            description,
            duration,
            total_questions
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setRecentTests(data || []);
    } catch (error) {
      console.error('Error fetching recent tests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get completed tests
      const { data: completedTests, error: completedError } = await supabase
        .from('user_tests')
        .select('score, total_questions, time_taken')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (completedError) throw completedError;

      if (completedTests && completedTests.length > 0) {
        const totalCompleted = completedTests.length;
        const totalScore = completedTests.reduce((sum, test) => sum + (test.score || 0), 0);
        const totalQuestions = completedTests.reduce((sum, test) => sum + (test.total_questions || 0), 0);
        const totalTime = completedTests.reduce((sum, test) => sum + (test.time_taken || 0), 0);

        setStats({
          testsCompleted: totalCompleted,
          averageScore: totalCompleted > 0 ? Math.round((totalScore / totalCompleted) * 100) / 100 : 0,
          totalQuestions: totalQuestions,
          timeSpent: Math.round(totalTime / 60) // Convert seconds to minutes
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        setLoading(false);
        return;
      }
      
      // Fetch all available tests
      let query = supabase
        .from('exam_tests')
        .select(`
          *,
          exam:exams (
            exam_name,
            category_id
          )
        `)
        .order('created_at', { ascending: false });
        
      // Apply category filter if not 'all'
      if (activeCategory !== 'all') {
        query = query.eq('exam.category_id', activeCategory);
      }
        
      const { data: testsData, error: testsError } = await query;
        
      if (testsError) {
        console.error("Error fetching tests:", testsError);
        setLoading(false);
        return;
      }
      
      // Fetch user's in-progress tests
      const { data: userTestsData, error: userTestsError } = await supabase
        .from('user_tests')
        .select('id, exam_test_id, status, created_at, score, total_questions')
        .eq('user_id', user.id)
        .in('status', ['in_progress', 'completed'])
        .order('created_at', { ascending: false });
        
      if (userTestsError) {
        console.error("Error fetching user tests:", userTestsError);
      }
      
      // Organize user tests by exam_test_id
      const userTestsMap = {};
      if (userTestsData) {
        userTestsData.forEach(test => {
          if (!userTestsMap[test.exam_test_id]) {
            userTestsMap[test.exam_test_id] = [];
          }
          userTestsMap[test.exam_test_id].push(test);
        });
      }
      
      setTests(testsData || []);
      setUserTests(userTestsMap);
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchTests:", error);
      setLoading(false);
    }
  };

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
        .eq('exam_test_id', testId)
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
                  onClick={() => navigate(`/test-result/${test.exam_test_id}?user_test_id=${test.id}`)}
                >
                  <div style={styles.recentTestInfo}>
                    <h3 style={typography.textMdBold}>{test.exam_tests?.title || 'Untitled Test'}</h3>
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
                  <h2 style={typography.textLgBold}>{test.title}</h2>
                  <p style={typography.textSmRegular}>{test.description}</p>
                  
                  <div style={styles.testInfo}>
                    <div style={styles.infoItem}>
                      <span style={typography.textSmRegular}>Duration:</span>
                      <span style={typography.textSmBold}>{test.duration} min</span>
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