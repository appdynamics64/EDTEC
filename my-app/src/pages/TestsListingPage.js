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

  useEffect(() => {
    fetchTests();
  }, []);

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
      const { data: testsData, error: testsError } = await supabase
        .from('exam_tests')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (testsError) {
        console.error("Error fetching tests:", testsError);
        setLoading(false);
        return;
      }
      
      // Fetch user's in-progress tests
      const { data: userTestsData, error: userTestsError } = await supabase
        .from('user_tests')
        .select('id, exam_test_id, status, created_at, score')
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

  const handleTestClick = (testId) => {
    // Check if there's an in-progress test
    const userTestsForThisExam = userTests[testId] || [];
    const inProgressTest = userTestsForThisExam.find(test => test.status === 'in_progress');
    
    if (inProgressTest) {
      // If there's an in-progress test, ask if they want to continue or start new
      if (window.confirm('You have an in-progress test. Do you want to continue it?\n\nClick OK to continue, or Cancel to view your results.')) {
        navigate(`/test/${testId}`);
      } else {
        // View results of the most recent completed test
        const completedTest = userTestsForThisExam.find(test => test.status === 'completed');
        if (completedTest) {
          navigate(`/test-result/${testId}?user_test_id=${completedTest.id}`);
        } else {
          navigate(`/test/${testId}`);
        }
      }
    } else {
      // If no in-progress test, just start a new one
      navigate(`/test/${testId}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading tests...</p>
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
              <div 
                key={test.id} 
                style={styles.testCard}
                onClick={() => handleTestClick(test.id)}
              >
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
                
                <div style={styles.testStatus}>
                  {inProgressTest ? (
                    <span style={styles.inProgressBadge}>In Progress</span>
                  ) : completedTests.length > 0 ? (
                    <span style={styles.completedBadge}>Completed</span>
                  ) : (
                    <span style={styles.newBadge}>New</span>
                  )}
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
    padding: '16px',
    minHeight: '100vh',
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textPrimary,
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  testCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
  },
  testInfo: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  testStatus: {
    position: 'absolute',
    top: '16px',
    right: '16px',
  },
  inProgressBadge: {
    backgroundColor: colors.warningLight,
    color: colors.warningDark,
    padding: '4px 8px',
    borderRadius: '4px',
    ...typography.textXsBold,
  },
  completedBadge: {
    backgroundColor: colors.successLight,
    color: colors.successDark,
    padding: '4px 8px',
    borderRadius: '4px',
    ...typography.textXsBold,
  },
  newBadge: {
    backgroundColor: colors.infoLight,
    color: colors.infoDark,
    padding: '4px 8px',
    borderRadius: '4px',
    ...typography.textXsBold,
  },
  noTests: {
    textAlign: 'center',
    padding: '32px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    gridColumn: '1 / -1',
  },
};

export default TestsListingPage; 