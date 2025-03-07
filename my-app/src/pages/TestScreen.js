import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestScreen = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [existingSession] = useState(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [testDetails, setTestDetails] = useState(null);
  const [error, setError] = useState(null);

  // Define createUserTestRecord with useCallback
  const createUserTestRecord = useCallback(async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(userError?.message || 'No user found');
      }
      
      // Get existing in-progress tests
      const { data: userTests, error: userTestError } = await supabase
        .from('user_tests')
        .select('id, status')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });
      
      if (userTestError) throw userTestError;
      
      // If there's an existing in-progress test, use that
      if (userTests && userTests.length > 0) {
        console.log('Found existing test:', userTests[0]);
        setCurrentTestId(userTests[0].id);
        return userTests[0].id;
      }
      
      // Otherwise create a new test
      const { data, error: insertError } = await supabase
        .from('user_tests')
        .insert([{
          test_id: testId,
          user_id: user.id,
          status: 'in_progress',
          start_time: new Date().toISOString()
        }])
        .select();
      
      if (insertError) throw insertError;
      
      if (!data || data.length === 0) {
        throw new Error('Failed to create test record');
      }
      
      console.log('Created new test:', data[0]);
      setCurrentTestId(data[0].id);
      return data[0].id;
    } catch (error) {
      console.error('Error creating user test record:', error);
      return null;
    }
  }, [testId]);

  // Define all function callbacks before useEffects
  const fetchTestDetails = useCallback(async () => {
    try {
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
            exam_description
          )
        `)
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTestDetails(data);
    } catch (error) {
      console.error('Error fetching test details:', error);
      setError('Failed to load test details');
    }
  }, [testId]);

  const fetchQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select(`
          *,
          question:question_id (*)
        `)
        .eq('test_id', testId)
        .order('question_order');

      if (error) throw error;
      
      setQuestions(data?.map(q => q.question) || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  }, [testId]);

  // Define handleFinishTest with useCallback
  const handleFinishTest = useCallback(async () => {
    try {
      setIsSubmitting(true);
      console.log('Finishing test');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(userError?.message || 'No user found');
      }

      const { data: userTests, error: userTestError } = await supabase
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
            duration_minutes
          )
        `)
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });

      if (userTestError || !userTests?.length) {
        throw new Error(userTestError?.message || 'No active test found');
      }

      const userTestId = userTests[0].id;

      const { error: updateError } = await supabase
        .from('user_tests')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', userTestId);

      if (updateError) throw updateError;

      console.log('Navigating to results:', `/test/${testId}/results/${userTestId}`);
      navigate(`/test/${testId}/results/${userTestId}`);
      
    } catch (error) {
      console.error('Error in handleFinishTest:', error);
      alert(`Failed to submit test: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowFinishModal(false);
    }
  }, [testId, navigate]);

  useEffect(() => {
    // Clean up any stale in-progress tests when the component mounts
    const cleanupStaleSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Mark tests older than 24 hours as abandoned
        await supabase
          .from('user_tests')
          .update({ status: 'abandoned' })
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      } catch (error) {
        console.error("Error cleaning up stale sessions:", error);
      }
    };
    
    cleanupStaleSessions();
  }, []);

  useEffect(() => {
    fetchTestDetails();
    fetchQuestions();
  }, [fetchTestDetails, fetchQuestions]);

  useEffect(() => {
    const initializeTest = async () => {
      try {
        console.log('Initializing test...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          console.error('No user found');
          navigate('/login');
          return;
        }

        // Create or get existing test record
        await createUserTestRecord();
        
        // Check for existing in-progress test
        const { data: existingTest, error: existingError } = await supabase
          .from('user_tests')
          .select('id, status')
          .eq('test_id', testId)
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          throw existingError;
        }

        if (existingTest) {
          console.log('Found existing test:', existingTest);
          setCurrentTestId(existingTest.id);
          return;
        }

        // Create new test if none exists
        const { data: newTest, error: createError } = await supabase
          .from('user_tests')
          .insert([{
            test_id: testId,
            user_id: user.id,
            status: 'in_progress',
            start_time: new Date().toISOString(),
            score: 0,
            time_taken: 0,
            total_questions_answered: 0
          }])
          .select()
          .single();

        if (createError) throw createError;

        console.log('Created new test:', newTest);
        setCurrentTestId(newTest.id);

      } catch (error) {
        console.error('Error initializing test:', error);
        alert('Failed to initialize test. Please try again.');
      }
    };

    initializeTest();
  }, [navigate, testId, createUserTestRecord]);

  // Set up countdown timer when test data is loaded
  useEffect(() => {
    if (testData && testData.duration_minutes) {
      // Convert duration from minutes to seconds
      setTimeRemaining(testData.duration_minutes * 60);
      
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
  }, [testData, handleFinishTest]);

  const handleSubmitAnswer = async (questionId, answer) => {
    try {
      console.log('Saving answer:', { questionId, answer, currentTestId });
      
      if (!currentTestId) {
        console.error('No current test ID found');
        return;
      }
      
      // Save to database
      const question = questions.find(q => q.id.toString() === questionId.toString());
      const isCorrect = question?.correct_answer === answer;
      
      const { error } = await supabase
        .from('user_test_questions')
        .upsert({
          user_test_id: currentTestId,
          question_id: questionId,
          selected_answer: answer,
          is_correct: isCorrect,
          marks_awarded: isCorrect ? 1 : 0,
          time_spent: 0
        });

      if (error) {
        console.error('Error saving answer:', error);
        throw error;
      }

      // Update local state
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));

      console.log('Answer saved successfully');
    } catch (error) {
      console.error('Error in handleSubmitAnswer:', error);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+D to toggle debug mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add a function to handle continuing an existing session
  const handleContinueSession = () => {
    console.log("Continuing existing session:", existingSession.id);
    setShowExistingSessionModal(false);
    // We can continue with the existing session
    // The test is already loaded, so no need to do anything else
  };

  // Update the handleAbandonSession function to be simpler and more robust
  const handleAbandonSession = async () => {
    if (!existingSession) return;
    
    try {
      console.log("Abandoning session:", existingSession.id);
      setLoading(true);
      setShowExistingSessionModal(false);
      
      // Mark the existing session as abandoned
      const { error: updateError } = await supabase
        .from('user_tests')
        .update({ status: 'abandoned' })
        .eq('id', existingSession.id);
        
      if (updateError) {
        console.error("Error abandoning session:", updateError);
      }
      
      // Wait to ensure the update completes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a new test
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        setLoading(false);
        return;
      }
      
      const newTest = await createUserTestRecord();
      
      // Reset the test state
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setLoading(false);
    } catch (error) {
      console.error("Error in handleAbandonSession:", error);
      setLoading(false);
      alert("We encountered an issue starting a new test. Please refresh the page and try again.");
    }
  };

  useEffect(() => {
    console.log('Current question:', questions[currentQuestion]);
    console.log('Selected answers:', selectedAnswers);
  }, [currentQuestion, questions, selectedAnswers]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          style={styles.backButton} 
          onClick={() => navigate(`/test/${testId}`)}
        >
          ←
        </button>
        
        {/* Timer */}
        {timeRemaining !== null && (
          <div style={styles.timer}>
            <span style={styles.timerIcon}>⏱️</span>
            <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
        
        {/* Updated Finish button */}
        <button 
          style={{
            ...styles.finishButton,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
          onClick={handleFinishTest}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Finish Test'}
        </button>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading questions...</p>
        </div>
      )}
      
      {/* Error state - No questions */}
      {!loading && questions.length === 0 && (
        <div style={styles.errorContainer}>
          <h2>No Questions Found</h2>
          <p>This test doesn't have any questions yet.</p>
          <button 
            style={styles.navButton}
            onClick={() => navigate(`/test/${testId}`)}
          >
            Go Back
          </button>
          <p style={{marginTop: '20px', fontSize: '14px', color: '#666'}}>
            Error details: Check console for more information
          </p>
        </div>
      )}
      
      {/* Questions */}
      {!loading && questions.length > 0 && (
        <>
          {/* Progress info */}
          <div style={styles.progressInfo}>
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Object.keys(selectedAnswers).length} answered</span>
          </div>
          
          {/* Current question */}
          <div style={styles.questionContainer}>
            <h2 style={typography.textXlBold}>Question {currentQuestion + 1}</h2>
            <p style={typography.textLgRegular}>{questions[currentQuestion]?.question_text || 'Question text not available'}</p>
            
            <div style={styles.optionsContainer}>
              {questions[currentQuestion]?.choices && 
               Object.entries(questions[currentQuestion].choices).map(([key, value]) => (
                <button
                  key={key}
                  style={{
                    ...styles.optionButton,
                      ...(selectedAnswers[questions[currentQuestion].id] === key ? styles.selectedOption : {})
                  }}
                    onClick={() => handleSubmitAnswer(questions[currentQuestion].id, key)}
                >
                  <span style={styles.optionKey}>{key}</span>
                  <span style={styles.optionText}>{value}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Navigation buttons */}
          <div style={styles.navigationButtons}>
            <button 
              style={{
                ...styles.navButton,
                opacity: currentQuestion === 0 ? 0.5 : 1,
              }}
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              Previous
            </button>
            <button 
              style={{
                ...styles.navButton,
                backgroundColor: colors.brandPrimary,
              }}
              onClick={currentQuestion === questions.length - 1 ? handleFinishTest : handleNext}
            >
              {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </>
      )}
      
      {/* Finish confirmation modal */}
      {showFinishModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={typography.textLgBold}>Finish Test?</h2>
            <p style={typography.textMdRegular}>
              You have answered {Object.keys(selectedAnswers).length} out of {questions.length} questions.
              Are you sure you want to finish the test?
            </p>
            <div style={styles.modalButtons}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowFinishModal(false)}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmButton}
                onClick={handleFinishTest}
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Existing session modal */}
      {showExistingSessionModal && existingSession && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={typography.textLgBold}>Resume Your Test</h2>
            <p style={typography.textMdRegular}>
              You have an in-progress test that was started {existingSession.minutesAgo} {existingSession.minutesAgo === 1 ? 'minute' : 'minutes'} ago.
            </p>
            <p style={{...typography.textSmRegular, marginTop: '8px', color: colors.textSecondary}}>
              You can continue where you left off or start a new attempt.
            </p>
            <div style={styles.modalButtons}>
              <button 
                style={styles.cancelButton}
                onClick={handleAbandonSession}
              >
                Start New
              </button>
              <button 
                style={styles.confirmButton}
                onClick={handleContinueSession}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Panel - only visible when debug mode is enabled */}
      {debugMode && (
        <div style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          height: '300px',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3>Debug Panel</h3>
            <button 
              onClick={() => {
                const debugText = debugLogs.map(log => 
                  `${log.timestamp} - ${log.message}${log.data ? '\n' + log.data : ''}`
                ).join('\n\n');
                navigator.clipboard.writeText(debugText);
                alert('Debug logs copied to clipboard');
              }}
              style={{
                backgroundColor: '#4a4a4a',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Copy Logs
            </button>
            <button 
              onClick={() => setDebugMode(false)}
              style={{
                backgroundColor: '#aa3333',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 16px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}>
            {debugLogs.map((log, index) => (
              <div key={index} style={{
                marginBottom: '8px',
                borderBottom: '1px solid #333',
                paddingBottom: '8px',
              }}>
                <div style={{
                  color: '#888',
                  marginBottom: '4px',
                }}>{log.timestamp}</div>
                <div style={{
                  color: '#fff',
                  fontWeight: 'bold',
                }}>{log.message}</div>
                {log.data && (
                  <pre style={{
                    backgroundColor: '#2a2a2a',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    overflow: 'auto',
                    maxHeight: '100px',
                  }}>{log.data}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    minHeight: '100vh',
    backgroundColor: colors.backgroundPrimary,
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
  errorContainer: {
    backgroundColor: colors.backgroundSecondary,
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textPrimary,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '20px',
  },
  timerIcon: {
    fontSize: '18px',
  },
  finishButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  questionContainer: {
    marginBottom: '32px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '24px',
  },
  optionButton: {
    padding: '16px',
    borderRadius: '12px',
    border: `1px solid ${colors.brandPrimary}`,
    backgroundColor: 'white',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    margin: '8px 0',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
    }
  },
  selectedOption: {
    backgroundColor: colors.brandPrimary,
    color: 'white',
    border: 'none',
  },
  optionKey: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    fontSize: '16px',
  },
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    position: 'fixed',
    bottom: '24px',
    left: '16px',
    right: '16px',
  },
  navButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    color: colors.backgroundPrimary,
    backgroundColor: colors.textSecondary,
    ...typography.textMdBold,
  },
};

export default TestScreen;