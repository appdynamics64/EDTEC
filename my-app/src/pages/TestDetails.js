import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';

const XPRewardPopup = ({ xpEarned, totalXp, onClose }) => {
  return (
    <div style={xpPopupStyles.overlay}>
      <div style={xpPopupStyles.modal}>
        <div style={xpPopupStyles.content}>
          <div style={xpPopupStyles.xpIcon}>🌟</div>
          <h2 style={xpPopupStyles.title}>Congratulations!</h2>
          <div style={xpPopupStyles.xpAmount}>+{xpEarned} XP</div>
          <p style={xpPopupStyles.totalXp}>Total XP: {totalXp}</p>
          <button 
            onClick={onClose}
            style={xpPopupStyles.closeButton}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [userAnswers, setUserAnswers] = useState({});
  const [testAttemptId, setTestAttemptId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [inProgressAttempt, setInProgressAttempt] = useState(null);
  const [showXPPopup, setShowXPPopup] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [totalXp, setTotalXp] = useState(0);

  const calculateXP = (stats) => {
    let xp = 0;
    
    // Base XP for completing the test
    xp += 50;

    // XP for correct answers (10 XP per correct answer)
    xp += stats.correctAnswers * 10;

    // Bonus XP for high accuracy (>75%)
    const accuracy = (stats.correctAnswers / stats.totalQuestions) * 100;
    if (accuracy >= 75) {
      xp += 50; // Bonus for high accuracy
    }

    return xp;
  };

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          console.log('User is not available yet, skipping data load');
          return; // Exit early if user is not available
        }

        // First fetch test details
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

        // Fetch scoring rules for this exam
        const { data: scoringRule, error: scoringError } = await supabase
          .from('scoring_rules')
          .select('marks_correct, marks_incorrect, marks_unanswered')
          .eq('exam_id', test.exam_id)
          .single();

        if (scoringError) throw scoringError;

        // Now fetch all attempts including the finalized ones
        const { data: testAttempts, error: attemptsError } = await supabase
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
          .order('created_at', { ascending: false })
          .limit(1);

        if (attemptsError) throw attemptsError;

        setTestData({ ...test, scoringRule });
        
        if (!testAttempts || testAttempts.length === 0) {
          setLastAttempt(null);
          setAttemptStats(null);
          return;
        }

        const lastAttempt = testAttempts[0];
        setLastAttempt(lastAttempt);

        // Use the final_score from the attempt
        setAttemptStats({
          totalQuestions: test.number_of_questions,
          attemptedQuestions: lastAttempt.test_attempt_answers.length,
          correctAnswers: lastAttempt.test_attempt_answers.filter(answer => 
            answer.selected_option && answer.selected_option.is_correct === true
          ).length,
          wrongAnswers: lastAttempt.test_attempt_answers.filter(answer => 
            answer.selected_option && answer.selected_option.is_correct === false
          ).length,
          unansweredQuestions: test.number_of_questions - lastAttempt.test_attempt_answers.length,
          totalMarks: lastAttempt.final_score,
          maxPossibleMarks: test.number_of_questions * scoringRule.marks_correct,
          correctMarks: lastAttempt.test_attempt_answers.filter(answer => 
            answer.selected_option && answer.selected_option.is_correct === true
          ).length * scoringRule.marks_correct,
          negativeMarks: lastAttempt.test_attempt_answers.filter(answer => 
            answer.selected_option && answer.selected_option.is_correct === false
          ).length * Math.abs(scoringRule.marks_incorrect),
          actualNegativeMarks: lastAttempt.test_attempt_answers.filter(answer => 
            answer.selected_option && answer.selected_option.is_correct === false
          ).length * Math.abs(scoringRule.marks_incorrect),
          unansweredMarks: (test.number_of_questions - lastAttempt.test_attempt_answers.length) * scoringRule.marks_unanswered
        });

        if (lastAttempt && attemptStats) {
          if (location.state?.justCompleted) {
            const earnedXP = calculateXP(attemptStats);
            
            // Record XP transaction
            const { data: xpTransaction, error: xpError } = await supabase
              .from('xp_transactions')
              .insert({
                user_id: user.id,
                source: 'test_completed',
                test_id: parseInt(testId),
                xp_earned: earnedXP
              })
              .select()
              .single();

            if (xpError) throw xpError;

            // Update user's total XP
            const { data: updatedProfile, error: profileError } = await supabase
              .from('profiles')
              .update({ 
                total_xp: supabase.raw('total_xp + ?', [earnedXP]),
                weekly_xp: supabase.raw('weekly_xp + ?', [earnedXP])
              })
              .eq('id', user.id)
              .select('total_xp')
        .single();
        
            if (profileError) throw profileError;

            setXpEarned(earnedXP);
            setTotalXp(updatedProfile.total_xp);
            setShowXPPopup(true);
          }
        }
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
  }, [testId, user, location.key, location.state?.justCompleted]);

  const handleStartTest = async () => {
    try {
      console.log('Starting test check...');
      // Check for in-progress attempts
      const { data: activeAttempt, error } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();

      console.log('Active attempt:', activeAttempt);
      console.log('Error:', error);

      if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
        throw error;
      }

      if (activeAttempt) {
        console.log('Found active attempt, showing modal');
        // There's an active attempt, show the confirmation modal
        setInProgressAttempt(activeAttempt);
        setShowConfirmModal(true);
      } else {
        console.log('No active attempt, creating new one');
        // No active attempt, create a new one before navigating
        const { data: newAttempt, error: createError } = await supabase
          .rpc('create_test_attempt', {
            p_test_id: parseInt(testId, 10),
            p_user_id: user.id
          });

        if (createError) throw createError;
        
        // Navigate to test screen
        navigate(`/test/${testId}/take`);
      }
    } catch (error) {
      console.error('Error checking/creating test attempt:', error);
      alert('Failed to start test. Please try again.');
    }
  };

  const handleViewSolutions = () => {
    navigate(`/test-solution/${testId}/${lastAttempt.id}`);
  };

  const handleContinueTest = () => {
    setShowConfirmModal(false);
    navigate(`/test/${testId}/take`);
  };

  const handleStartNewTest = async () => {
    try {
      // Finalize the existing attempt
      await supabase.rpc('finalize_test_attempt', {
        p_test_attempt_id: inProgressAttempt.id,
        p_ended_by: 'user'
      });
      
      // Navigate to start new test
      navigate(`/test/${testId}/take`);
    } catch (error) {
      console.error('Error finalizing existing attempt:', error);
      // Handle error appropriately
    }
  };

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
                    {lastAttempt.final_score}/{attemptStats.maxPossibleMarks}
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

      <ConfirmationModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onContinue={handleContinueTest}
        onStartNew={handleStartNewTest}
      />

      {showXPPopup && (
        <XPRewardPopup
          xpEarned={xpEarned}
          totalXp={totalXp}
          onClose={() => setShowXPPopup(false)}
        />
      )}
      </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onContinue, onStartNew }) => {
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h2 style={modalStyles.title}>Test In Progress</h2>
        <p style={modalStyles.message}>
          You have an unfinished test attempt. Would you like to continue where you left off or start a new attempt?
        </p>
        <div style={modalStyles.buttons}>
          <button 
            onClick={onContinue}
            style={modalStyles.continueButton}
          >
            Continue Test
          </button>
          <button 
            onClick={onStartNew}
            style={modalStyles.newButton}
          >
            Start New Test
          </button>
            <button 
            onClick={onClose}
            style={modalStyles.cancelButton}
          >
            Cancel
            </button>
          </div>
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

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    zIndex: 10000,
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1a202c',
  },
  message: {
    marginBottom: '24px',
    fontSize: '1rem',
    color: '#4B5563',
    lineHeight: '1.5',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  continueButton: {
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#059669',
    },
  },
  newButton: {
    padding: '8px 16px',
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#DC2626',
    },
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#4B5563',
    },
  },
};

const xpPopupStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    animation: 'popIn 0.5s ease-out',
  },
  content: {
    textAlign: 'center',
  },
  xpIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    color: '#2C3E50',
    fontSize: '24px',
    marginBottom: '16px',
  },
  xpAmount: {
    color: '#27AE60',
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  totalXp: {
    color: '#7F8C8D',
    fontSize: '16px',
    marginBottom: '24px',
  },
  closeButton: {
    backgroundColor: '#3498DB',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#2980B9',
    },
  },
};

export default TestDetails; 