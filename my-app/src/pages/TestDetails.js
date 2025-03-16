import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';

const TestDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const { user } = useAuth();
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAttempt, setLastAttempt] = useState(null);
  const [attemptStats, setAttemptStats] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFinishPopup, setShowFinishPopup] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // First fetch test details with exam_id
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

        if (testError) throw testError;

        // Then fetch scoring rules for this exam
        const { data: scoringRule, error: scoringError } = await supabase
          .from('scoring_rules')
          .select('marks_correct, marks_incorrect, marks_unanswered')
          .eq('exam_id', test.exam_id)
          .single();

        if (scoringError) throw scoringError;

        // Fetch test questions to get the actual total
        const { data: testQuestions, error: questionsError } = await supabase
          .from('test_questions')
          .select('question_id')
          .eq('test_id', testId);

        if (questionsError) throw questionsError;

        const totalQuestions = testQuestions?.length || test.number_of_questions;

        // Updated query with proper join to question_options
        const { data: attempts, error: attemptsError } = await supabase
          .from('test_attempts')
          .select(`
            id,
            start_time,
            end_time,
            final_score,
            created_at,
            test_attempt_answers (
              id,
              question_id,
              selected_option_id,
              selected_option:question_options!selected_option_id (
                id,
                is_correct
              )
            )
          `)
          .eq('test_id', testId)
          .eq('user_id', user.id)
          .not('end_time', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('Raw attempt data:', attempts?.[0]); // Debug log

        if (attemptsError) throw attemptsError;

        setTestData({ ...test, scoringRule });
        
        if (!attempts || attempts.length === 0) {
          setLastAttempt(null);
          setAttemptStats(null);
          return;
        }

        const lastAttempt = attempts[0];
        setLastAttempt(lastAttempt);

        // Get unique attempted questions (to avoid counting duplicates)
        const uniqueAttemptedQuestions = new Set(
          lastAttempt.test_attempt_answers.map(answer => answer.question_id)
        );
        const attemptedQuestions = uniqueAttemptedQuestions.size;

        // Validate attempted questions count
        if (attemptedQuestions > totalQuestions) {
          console.error('Invalid attempt count detected:', {
            attempted: attemptedQuestions,
            total: totalQuestions
          });
          // Use the total questions as the maximum possible attempts
          attemptedQuestions = totalQuestions;
        }
        
        // Check if selected option is correct
        const correctAnswers = lastAttempt.test_attempt_answers.filter(answer => 
          answer.selected_option && answer.selected_option.is_correct === true
        ).length;

        console.log('Answer statistics:', { // Debug log
          totalQuestions,
          uniqueAttempted: attemptedQuestions,
          rawAttempted: lastAttempt.test_attempt_answers.length,
          correct: correctAnswers,
          answers: lastAttempt.test_attempt_answers.map(answer => ({
            questionId: answer.question_id,
            selectedOptionId: answer.selected_option_id,
            isCorrect: answer.selected_option?.is_correct
          }))
        });

        const wrongAnswers = attemptedQuestions - correctAnswers;
        const unansweredQuestions = totalQuestions - attemptedQuestions;
        
        // Calculate marks based on scoring rules
        const correctMarks = correctAnswers * scoringRule.marks_correct;
        const negativeMarks = wrongAnswers * scoringRule.marks_incorrect;
        const unansweredMarks = unansweredQuestions * scoringRule.marks_unanswered;
        
        // Calculate total and maximum possible marks
        const totalMarks = correctMarks + negativeMarks + unansweredMarks;
        const maxPossibleMarks = totalQuestions * scoringRule.marks_correct;

        setAttemptStats({
          totalQuestions,
          attemptedQuestions,
          correctAnswers,
          wrongAnswers,
          unansweredQuestions,
          totalMarks: Math.round(totalMarks * 100) / 100,
          maxPossibleMarks,
          correctMarks,
          negativeMarks: Math.abs(negativeMarks),
          actualNegativeMarks: negativeMarks,
          unansweredMarks
        });

      } catch (error) {
        console.error('Error fetching test details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTestDetails();
    }

    return () => {
      setLastAttempt(null);
      setAttemptStats(null);
      setTestData(null);
    };
  }, [testId, user, location.key]);

  const handleStartTest = () => {
    navigate(`/test/${testId}/take`);
  };

  const handleViewSolutions = () => {
    navigate(`/test/${testId}/solutions/${lastAttempt.id}`);
  };

  const handleFinishTest = async () => {
    try {
      setSubmissionError(null);
      setIsSubmitting(true);
      setShowFinishPopup(false);
      
      if (!user) {
        setSubmissionError("User not authenticated. Please log in again.");
        return;
      }
      
      // Calculate attempted questions
      const attemptedQuestions = Object.keys(userAnswers).length;
      
      // First update the test status to completed
      const { error: updateError } = await supabase
        .from('test_attempts')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress');
        
      if (updateError) {
        console.error('Error updating test status:', updateError);
        setSubmissionError(`Failed to update test status: ${updateError.message}`);
        return;
      }
      
      // Then insert the final test record
      const { error: insertError } = await supabase
        .from('user_tests')
        .insert({
          user_id: user.id,
          test_id: testId,
          status: 'completed',
          score: 0, // This will be calculated later
          end_time: new Date().toISOString(),
          total_questions_answered: attemptedQuestions
        });
        
      if (insertError) {
        console.error('Error creating user test:', insertError);
        setSubmissionError(`Database error: ${insertError.message}`);
        return;
      }
      
      console.log('Test completed successfully, navigating to results...');
      navigate(`/test-result/${testId}`, { replace: true });
      
    } catch (error) {
      console.error('Error finishing test:', error);
      setSubmissionError(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer effect that also handles test completion
  useEffect(() => {
    if (testData && testData.test_duration) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFinishTest(); // This will update the status and navigate
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [testData]);

  if (loading) return <LoadingScreen />;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!testData) return <div style={styles.error}>Test not found</div>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.type}>
            {testData.type === 'recommended' ? 'Recommended Test' : 'Custom Test'}
          </span>
          <h1 style={styles.title}>{testData.test_name}</h1>
        </div>

        <div style={styles.details}>
          <div style={styles.infoItem}>
            <span>Total Questions:</span>
            <span>{testData?.number_of_questions}</span>
          </div>
          <div style={styles.infoItem}>
            <span>Duration:</span>
            <span>{testData?.test_duration} minutes</span>
          </div>
          {testData?.scoringRule && (
            <div style={styles.infoItem}>
              <span>Marking Scheme:</span>
              <span>
                +{testData.scoringRule.marks_correct} / 
                -{Math.abs(testData.scoringRule.marks_incorrect)} / 
                {testData.scoringRule.marks_unanswered}
              </span>
            </div>
          )}
        </div>

        {lastAttempt && attemptStats && (
          <div style={styles.history}>
            <h3 style={styles.historyTitle}>Previous Attempt Statistics</h3>
            
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Total Questions</span>
                <span style={styles.statValue}>{attemptStats.totalQuestions}</span>
              </div>
              
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Attempted</span>
                <span style={styles.statValue}>{attemptStats.attemptedQuestions}</span>
              </div>
              
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Correct</span>
                <span style={styles.statValue}>
                  <span style={styles.correctAnswer}>
                    {attemptStats.correctAnswers} (+{attemptStats.correctMarks})
                  </span>
                </span>
              </div>
              
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Wrong</span>
                <span style={styles.statValue}>
                  <span style={styles.wrongAnswer}>
                    {attemptStats.wrongAnswers} (-{attemptStats.negativeMarks})
                  </span>
                </span>
              </div>
              
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Unanswered</span>
                <span style={styles.statValue}>
                  {attemptStats.unansweredQuestions} ({attemptStats.unansweredMarks})
                </span>
              </div>
              
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Final Score</span>
                <span style={styles.statValue}>
                  <span style={styles.scoreValue}>
                    {attemptStats.totalMarks < 0 ? '-' : ''}{Math.abs(attemptStats.totalMarks)}/{attemptStats.maxPossibleMarks}
                  </span>
                </span>
              </div>
            </div>

            <div style={styles.actions}>
              <button onClick={handleViewSolutions} style={styles.secondaryButton}>
                View Solutions
              </button>
            </div>
          </div>
        )}

        <button onClick={handleStartTest} style={styles.startButton}>
          {lastAttempt ? 'Retake Test' : 'Start Test'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  backButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#007bff',
    marginBottom: '20px',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '24px',
  },
  type: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '16px',
    fontSize: '14px',
    marginBottom: '12px',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    margin: '0',
    color: '#111827',
  },
  details: {
    marginBottom: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  history: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  historyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#2d3748',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statItem: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
  },
  correctAnswer: {
    color: '#38a169',
  },
  wrongAnswer: {
    color: '#e53e3e',
  },
  scoreValue: {
    color: '#3182ce',
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  startButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#0056b3',
    },
  },
  secondaryButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #007bff',
    color: '#007bff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  errorMessage: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
};

export default TestDetails;