import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestDetails = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("TestDetails component mounted with testId:", testId);
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      console.log("Fetching test details for testId:", testId);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      
      // First, check if the test exists
      const { data: testCheck, error: testCheckError } = await supabase
        .from('exam_tests')
        .select('id')
        .eq('id', testId)
        .single();
        
      if (testCheckError) {
        console.error("Error checking test existence:", testCheckError);
        throw testCheckError;
      }
      
      if (!testCheck) {
        console.error("Test not found with ID:", testId);
        setError("Test not found");
        setLoading(false);
        return;
      }
      
      // If test exists, fetch full details
      const { data, error } = await supabase
        .from('exam_tests')
        .select(`
          *,
          exam:exam_id(exam_name),
          user_tests(
            id,
            score,
            status,
            end_time
          )
        `)
        .eq('id', testId)
        .single();

      if (error) {
        console.error("Error fetching test details:", error);
        throw error;
      }
      
      console.log("Test data fetched:", data);
      
      // Get only this user's test attempts
      if (data.user_tests && data.user_tests.length > 0) {
        const userTests = data.user_tests.filter(test => test.user_id === user.id);
        data.user_tests = userTests;
      }
      
      setTestData(data);
    } catch (error) {
      console.error('Error in fetchTestDetails:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("User not authenticated");
        return;
      }
      
      // Create a new user_test entry
      const { data, error } = await supabase
        .from('user_tests')
        .insert({
          user_id: user.id,
          exam_test_id: testId,
          status: 'in_progress',
          start_time: new Date().toISOString(),
          total_questions_answered: 0,
          score: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the test questions
      navigate(`/test/${testId}/questions`);
    } catch (error) {
      console.error('Error starting test:', error);
      setError(error.message);
    }
  };

  const handleViewSolutions = () => {
    navigate(`/test/${testId}/solutions`);
  };

  const handleRedoTest = () => {
    handleStartTest(); // Reuse the start test logic
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div style={styles.container}>Loading test details...</div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={typography.displaySmBold}>Error</h2>
          <p style={typography.textMdRegular}>{error}</p>
          <button onClick={handleBack} style={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={typography.displaySmBold}>Test Not Found</h2>
          <p style={typography.textMdRegular}>
            We couldn't find the test you're looking for.
          </p>
          <button onClick={handleBack} style={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const lastAttempt = testData.user_tests?.[0];
  const isCompleted = lastAttempt?.status === 'completed';

  return (
    <div style={styles.container}>
      <button onClick={handleBack} style={styles.backButton}>
        ←
      </button>

      <div style={styles.card}>
        <div style={styles.iconContainer}>
          {testData.type === 'recommended' && <span>👤</span>}
          {testData.type === 'random' && <span>🎲</span>}
          {testData.type === 'custom' && <span>✏️</span>}
        </div>

        <h1 style={typography.displayMdBold}>{testData.test_name}</h1>

        <div style={styles.detailsContainer}>
          <h2 style={typography.displayLgBold}>
            {testData.total_questions} Questions
          </h2>
          <p style={typography.textLgRegular}>{testData.duration} minutes</p>
        </div>

        <div style={styles.bottomIconContainer}>
          <span style={styles.waveIcon}>👋</span>
        </div>

        {!isCompleted ? (
          <button 
            onClick={handleStartTest}
            style={styles.startButton}
          >
            <span style={styles.buttonIcon}>📝</span>
            Start test
          </button>
        ) : (
          <div style={styles.completedActions}>
            <div style={styles.scoreContainer}>
              <span style={typography.textLgBold}>Your Score</span>
              <span style={typography.displaySmBold}>
                {lastAttempt.score}/{testData.total_questions}
              </span>
            </div>
            <button 
              onClick={handleViewSolutions}
              style={styles.solutionsButton}
            >
              View solutions
            </button>
            <button 
              onClick={handleRedoTest}
              style={styles.redoButton}
            >
              Redo test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: colors.backgroundSecondary,
  },
  errorContainer: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '0 auto',
    marginTop: '40px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: '24px',
    padding: '32px',
    position: 'relative',
    overflow: 'hidden',
    color: colors.backgroundPrimary,
  },
  iconContainer: {
    fontSize: '32px',
    marginBottom: '16px',
  },
  detailsContainer: {
    marginTop: '32px',
    marginBottom: '48px',
  },
  bottomIconContainer: {
    position: 'absolute',
    bottom: '32px',
    right: '32px',
  },
  waveIcon: {
    fontSize: '32px',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: colors.backgroundPrimary,
    color: colors.brandPrimary,
    border: 'none',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
  buttonIcon: {
    fontSize: '20px',
  },
  completedActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  scoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  solutionsButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: colors.backgroundPrimary,
    color: colors.brandPrimary,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
  redoButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
};

export default TestDetails; 