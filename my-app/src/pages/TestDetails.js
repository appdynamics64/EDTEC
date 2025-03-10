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
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showFinishPopup, setShowFinishPopup] = useState(false);

  // Keep track of user answers
  const [userAnswers, setUserAnswers] = useState({});
  
  // Add this to your state variables at the top
  const [submissionError, setSubmissionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to open the finish confirmation popup
  const openFinishPopup = () => {
    setShowFinishPopup(true);
  };

  // Function to close the finish confirmation popup
  const closeFinishPopup = () => {
    setShowFinishPopup(false);
  };

  useEffect(() => {
    console.log("TestDetails component mounted with testId:", testId);
    fetchTestDetails();
    fetchQuestions();
  }, [testId]);

  useEffect(() => {
    if (testData && testData.duration) {
      // Convert duration from minutes to seconds
      setTimeRemaining(testData.duration * 60);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFinishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [testData]);

  const fetchTestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_tests')
        .select('*')
        .eq('id', testId)
        .single();
        
      if (error) throw error;
      console.log("Test details:", data);
      setTestData(data);
    } catch (error) {
      console.error('Error fetching test details:', error);
      setError('Failed to load test details');
    } finally {
      // Only set loading to false if fetchQuestions has also completed
      if (questions.length > 0 || error) {
        setLoading(false);
      }
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data: testQuestions, error: testQuestionsError } = await supabase
        .from('exam_test_questions')
        .select('question_id, question_order')
        .eq('exam_test_id', testId);

      if (testQuestionsError) throw testQuestionsError;

      if (!testQuestions || testQuestions.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      const { data: questionDetails, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', testQuestions.map(q => q.question_id));

      if (questionsError) throw questionsError;

      setQuestions(questionDetails || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load test questions');
    } finally {
      // Always set loading to false when this function completes
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

  const handleFinishTest = async () => {
    try {
      // Reset error state
      setSubmissionError(null);
      // Set submitting state to show a loading indicator
      setIsSubmitting(true);
      // Close the popup
      setShowFinishPopup(false);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSubmissionError("User not authenticated. Please log in again.");
        return;
      }
      
      // Calculate attempted questions and correct answers
      const attemptedQuestions = Object.keys(userAnswers).length;
      
      // Show what we're trying to insert
      console.log('Attempting to insert user test:', {
        user_id: user.id,
        exam_test_id: testId,
        status: 'completed',
        score: 0,
        end_time: new Date(),
        total_questions_answered: attemptedQuestions
      });
      
      // Step 1: Just insert without trying to return the record
      const { error: insertError } = await supabase
        .from('user_tests')
        .insert({
          user_id: user.id,
          exam_test_id: testId,
          status: 'completed',
          score: 0,
          end_time: new Date(),
          total_questions_answered: attemptedQuestions
        });
        
      if (insertError) {
        console.error('Error creating user test:', insertError);
        setSubmissionError(`Database error: ${insertError.message}`);
        throw insertError;
      }
      
      console.log('Test record inserted successfully, navigating to results...');
      console.log('Target URL:', `/test-result/${testId}`);
      
      // Try navigation with a timeout to see if it's a timing issue
      setTimeout(() => {
        try {
          navigate(`/test-result/${testId}`, { replace: true });
          console.log('Navigation called');
        } catch (navError) {
          console.error('Navigation error:', navError);
          setSubmissionError(`Navigation error: ${navError.message}`);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error finishing test:', error);
      setSubmissionError(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the finish confirmation popup
  const renderFinishPopup = () => {
    if (!showFinishPopup) return null;
    
    return (
      <div style={styles.popupOverlay}>
        <div style={styles.popup}>
          <h3 style={typography.textLgBold}>Finish Test?</h3>
          <p style={typography.textMdRegular}>
            Are you sure you want to finish this test? You cannot resume once submitted.
          </p>
          <div style={styles.popupButtons}>
            <button 
              onClick={closeFinishPopup}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button 
              onClick={handleFinishTest}
              style={styles.confirmButton}
            >
              Yes, Finish
            </button>
          </div>
        </div>
      </div>
    );
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
      {submissionError && (
        <div style={styles.errorMessage}>
          <p style={typography.textMdBold}>Error Submitting Test</p>
          <p style={typography.textMdRegular}>{submissionError}</p>
          <button 
            onClick={() => setSubmissionError(null)} 
            style={styles.dismissButton}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {isSubmitting && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingMessage}>
            Submitting test...
          </div>
        </div>
      )}
      
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

      {/* Render the finish popup */}
      {renderFinishPopup()}
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
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popup: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  popupButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.borderPrimary}`,
    cursor: 'pointer',
    ...typography.textMdMedium,
  },
  confirmButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textMdMedium,
  },
  errorMessage: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: colors.accentError || 'red',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    zIndex: 2000,
    width: '90%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  dismissButton: {
    alignSelf: 'flex-end',
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    marginTop: '8px',
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
  },
  loadingMessage: {
    backgroundColor: colors.backgroundSecondary,
    padding: '20px 30px',
    borderRadius: '8px',
    ...typography.textLgMedium,
    color: colors.textPrimary,
  },
};

export default TestDetails; 