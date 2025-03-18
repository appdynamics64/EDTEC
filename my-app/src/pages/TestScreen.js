import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';

const TestScreen = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testAttemptId, setTestAttemptId] = useState(null);
  const [testDetails, setTestDetails] = useState(null);

  useEffect(() => {
    const initializeTest = async () => {
      if (!user || !user.id) {
        console.error('User not properly authenticated');
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        // 1. First fetch test details
        const { data: test, error: testError } = await supabase
          .from('tests')
          .select(`
            id,
            test_name,
            test_duration,
            number_of_questions,
            type,
            exam_id
          `)
          .eq('id', testId)
          .single();

        if (testError) throw new Error('Failed to fetch test details');
        if (!test) throw new Error('Test not found');

        setTestDetails(test);

        // 2. Get ONLY active attempts (not ended)
        const { data: activeAttempts, error: activeError } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('test_id', testId)
          .eq('user_id', user.id)
          .is('end_time', null)
          .order('created_at', { ascending: false });

        if (activeError) throw new Error('Failed to check active attempts');

        let attemptId;
        const now = new Date();

        if (activeAttempts && activeAttempts.length > 0) {
          const latestAttempt = activeAttempts[0];
          const startTime = new Date(latestAttempt.start_time);
          const duration = test.test_duration * 60 * 1000;

          if (now.getTime() - startTime.getTime() > duration) {
            // Attempt has expired, finalize it first
            await supabase.rpc('finalize_test_attempt', {
              p_test_attempt_id: latestAttempt.id,
              p_ended_by: 'timeout'
            });

            // Wait a moment to ensure finalization is complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Double-check no active attempts exist before creating new one
            const { data: checkAgain } = await supabase
              .from('test_attempts')
              .select('id')
              .eq('test_id', testId)
              .eq('user_id', user.id)
              .is('end_time', null)
              .single();

            if (!checkAgain) {
              // Create new attempt only if there are no active attempts
              const { data: attempt, error: attemptError } = await supabase
                .rpc('create_test_attempt', {
                  p_test_id: parseInt(test.id, 10),
                  p_user_id: user.id
                });

                if (attemptError) throw new Error('Failed to create/get test attempt');
                
                attemptId = attempt.id;
                setTimeRemaining(test.test_duration * 60);
            } else {
              attemptId = checkAgain.id;
              const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
              const totalSeconds = test.test_duration * 60;
              setTimeRemaining(Math.max(0, totalSeconds - elapsedSeconds));
            }
          } else {
            // Use existing active attempt
            attemptId = latestAttempt.id;
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const totalSeconds = test.test_duration * 60;
            setTimeRemaining(Math.max(0, totalSeconds - elapsedSeconds));
          }
        } else {
          // No active attempts exist, try to create one with a unique constraint
          const { data: attempt, error: attemptError } = await supabase
            .rpc('create_test_attempt', {
              p_test_id: parseInt(test.id, 10),
              p_user_id: user.id
            });

            if (attemptError) throw new Error('Failed to create/get test attempt');
            
            attemptId = attempt.id;
            setTimeRemaining(test.test_duration * 60);
        }

        setTestAttemptId(attemptId);

        // 5. Fetch questions
        const { data: questionData, error: questionsError } = await supabase
          .from('test_questions')
          .select(`
            id,
            question_id,
            question_order,
            questions (
              id,
              question_text,
              question_options (
                id,
                option_text,
                is_correct
              )
            )
          `)
          .eq('test_id', testId)
          .order('question_order');

        if (questionsError) throw new Error('Failed to fetch questions');

        const formattedQuestions = questionData.map(q => ({
          id: q.questions.id,
          question_text: q.questions.question_text,
          options: q.questions.question_options,
          order: q.question_order
        }));

        setQuestions(formattedQuestions);

        // 6. Load existing answers if any
        if (attemptId) {
          const { data: existingAnswers } = await supabase
            .from('test_attempt_answers')
            .select('question_id, selected_option_id')
            .eq('test_attempt_id', attemptId);

          if (existingAnswers) {
            const answersMap = {};
            existingAnswers.forEach(answer => {
              answersMap[answer.question_id] = answer.selected_option_id;
            });
            setSelectedAnswers(answersMap);
          }
        }

      } catch (error) {
        console.error('Detailed error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializeTest();
    }
  }, [testId, user, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Call finalize_test_attempt with 'timeout' reason
          supabase.rpc('finalize_test_attempt', {
            p_test_attempt_id: testAttemptId,
            p_ended_by: 'timeout'
          }).then(() => {
            navigate(`/test-details/${testId}`);
          }).catch(error => {
            console.error('Error finalizing test:', error);
            alert('Failed to submit test. Please try again.');
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, testAttemptId, testId, navigate]);

  const handleAnswerSelect = async (questionId, optionId) => {
    try {
      // Find if the selected option is correct
      const isCorrect = questions
        .find(q => q.id === questionId)
        ?.options
        .find(o => o.id === optionId)
        ?.is_correct || false;

      // Use the new upsert function
      const { error } = await supabase.rpc('upsert_test_attempt_answer', {
        p_test_attempt_id: testAttemptId,
        p_question_id: questionId,
        p_selected_option_id: optionId,
        p_is_correct: isCorrect
      });

      if (error) throw error;

      // Update local state
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: optionId
      }));
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleFinishTest = async () => {
    try {
      setIsSubmitting(true);

      // Call the finalize_test_attempt function instead of calculating score in frontend
      const { error: finalizeError } = await supabase.rpc('finalize_test_attempt', {
        p_test_attempt_id: testAttemptId,
        p_ended_by: 'user'
      });

      if (finalizeError) {
        throw finalizeError;
      }

      // Navigate to results
      navigate(`/test-details/${testId}`);
    } catch (error) {
      console.error('Error finishing test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  if (loading) return <LoadingScreen />;
  
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorText}>{error}</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.backButton}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!testDetails || !questions.length) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>No test data available.</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.backButton}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.timer}>
          Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
        </div>
        <button 
          onClick={handleFinishTest}
          disabled={isSubmitting}
          style={styles.finishButton}
        >
          {isSubmitting ? 'Submitting...' : 'Finish Test'}
        </button>
      </div>

      {/* Question Display */}
      {!loading && questions.length > 0 && (
        <div style={styles.questionContainer}>
          <h2>Question {currentQuestion + 1} of {questions.length}</h2>
          <p style={styles.questionText}>{questions[currentQuestion]?.question_text}</p>
          
          <div style={styles.optionsContainer}>
            {questions[currentQuestion]?.options.map(option => (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(questions[currentQuestion].id, option.id)}
                style={{
                  ...styles.optionButton,
                  ...(selectedAnswers[questions[currentQuestion].id] === option.id 
                    ? styles.selectedOption 
                    : {})
                }}
              >
                {option.option_text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {!loading && questions.length > 0 && (
        <div style={styles.navigation}>
          <button
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
            style={styles.navButton}
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (currentQuestion === questions.length - 1) {
                handleFinishTest();
              } else {
                setCurrentQuestion(prev => prev + 1);
              }
            }}
            style={styles.navButton}
          >
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  timer: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  finishButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  questionContainer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  questionText: {
    fontSize: '18px',
    marginBottom: '20px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionButton: {
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'left',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  navButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  errorContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px',
    margin: '40px auto',
  },
  errorTitle: {
    color: '#dc3545',
    marginBottom: '16px',
    fontSize: '24px',
  },
  errorText: {
    color: '#666',
    marginBottom: '20px',
    fontSize: '16px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

export default TestScreen;