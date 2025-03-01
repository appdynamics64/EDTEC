import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  
  // Debug to check what we're receiving
  console.log("TestResult mounted. testId:", testId);
  console.log("location state:", location.state);
  
  const [loading, setLoading] = useState(!location.state);
  const [resultData, setResultData] = useState(location.state || {
    score: 0,
    totalQuestions: 0,
    attempted: 0,
    correct: 0,
    wrong: 0,
    userTestId: null
  });

  useEffect(() => {
    // If we don't have state from navigation, fetch the data
    if (!location.state && testId) {
      fetchTestResult();
    }
  }, [testId, location.state]);

  const fetchTestResult = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Get the most recent completed test for this test ID and user
      const { data: userTest, error: userTestError } = await supabase
        .from('user_tests')
        .select('*, exam_tests(total_questions)')
        .eq('exam_test_id', testId)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (userTestError) throw userTestError;

      // Get the questions answered in this test
      const { data: userAnswers, error: answersError } = await supabase
        .from('user_test_questions')
        .select('*')
        .eq('user_test_id', userTest.id);

      if (answersError) throw answersError;
      
      // Calculate statistics
      const correct = userAnswers.filter(q => q.is_correct).length;
      const attempted = userAnswers.length;
      const wrong = attempted - correct;
      
      setResultData({
        score: userTest.score,
        totalQuestions: userTest.exam_tests?.total_questions || 0,
        attempted,
        correct,
        wrong,
        userTestId: userTest.id
      });
    } catch (error) {
      console.error('Error fetching test result:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = () => {
    return resultData.totalQuestions > 0 
      ? Math.round((resultData.score / resultData.totalQuestions) * 100) 
      : 0;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading results...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Test Results</h1>
        
        <div style={styles.scoreSection}>
          <h2 style={styles.scoreLabel}>Your Score</h2>
          <p style={styles.scoreValue}>{calculatePercentage()}%</p>
          <p style={styles.scoreDetail}>({resultData.score}/{resultData.totalQuestions} points)</p>
        </div>

        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Questions Attempted</span>
            <span style={styles.statValue}>{resultData.attempted}/{resultData.totalQuestions}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Correct Answers</span>
            <span style={{...styles.statValue, color: colors.success}}>{resultData.correct}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Wrong Answers</span>
            <span style={{...styles.statValue, color: colors.error}}>{resultData.wrong}</span>
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
  loading: {
    color: colors.backgroundPrimary,
    ...typography.textLgRegular,
    textAlign: 'center',
    marginTop: '40px',
  },
};

export default TestResult; 