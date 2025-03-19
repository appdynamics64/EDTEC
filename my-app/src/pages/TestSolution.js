import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import LoadingScreen from '../components/LoadingScreen';
import useAuth from '../hooks/useAuth';

const TestSolution = () => {
  const navigate = useNavigate();
  const { testId, attemptId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);
  const [attemptStats, setAttemptStats] = useState(null);
  const [solutions, setSolutions] = useState([]);

  // Add a console log to verify the component is being reached
  console.log('TestSolution mounted with:', { testId, attemptId });

  // Add a console log to verify the user and loading states
  console.log('Auth state:', { user, authLoading });

  useEffect(() => {
    const fetchSolutions = async () => {
      try {
        console.log('Starting fetchSolutions with:', { testId, attemptId, user });
        setLoading(true);
        
        // First verify that this attempt belongs to the current user
        const { data: attemptCheck, error: checkError } = await supabase
          .from('test_attempts')
          .select('user_id')
          .eq('id', attemptId)
          .single();

        console.log('Attempt check result:', { attemptCheck, checkError });

        if (checkError) throw checkError;

        if (!attemptCheck || attemptCheck.user_id !== user.id) {
          console.error('Unauthorized access:', { 
            attemptCheck, 
            userId: user.id 
          });
          navigate('/dashboard');
          return;
        }

        // Step 3: Fetch detailed test attempt data
        const { data: testAttempt, error: attemptError } = await supabase
          .from('test_attempts')
          .select(`
            *,
            test:tests (
              *,
              exam:exams (
                scoring_rules (*)
              )
            )
          `)
          .eq('id', attemptId)
          .eq('user_id', user.id)  // This line ensures we only get the user's own attempt
          .single();

        if (attemptError) throw attemptError;

        // Then fetch all questions for this test
        const { data: testQuestions, error: questionsError } = await supabase
          .from('test_questions')
          .select(`
            question_order,
            questions (
              id,
              question_text,
              explanation,
              question_options (*)
            )
          `)
          .eq('test_id', testAttempt.test_id)
          .order('question_order');

        if (questionsError) throw questionsError;

        // Fetch user's answers for this attempt
        const { data: userAnswers, error: answersError } = await supabase
          .from('test_attempt_answers')
          .select('*')
          .eq('test_attempt_id', attemptId);

        if (answersError) throw answersError;

        // Create a map of question_id to user's answer
        const answersMap = {};
        userAnswers?.forEach(answer => {
          answersMap[answer.question_id] = answer;
        });

        // Combine questions with user answers
        const allSolutions = testQuestions.map(tq => {
          const question = tq.questions;
          const userAnswer = answersMap[question.id] || null;
          
          return {
            id: question.id,
            question_text: question.question_text,
            explanation: question.explanation,
            question_options: question.question_options,
            selected_option_id: userAnswer?.selected_option_id || null,
            is_correct: userAnswer?.is_correct || false,
            is_attempted: !!userAnswer
          };
        });

        // Calculate statistics
        const scoringRule = testAttempt.test.exam.scoring_rules[0];
        const totalQuestions = testAttempt.test.number_of_questions;
        const attemptedAnswers = userAnswers || [];

        const stats = {
          totalQuestions,
          attemptedQuestions: attemptedAnswers.length,
          correctAnswers: attemptedAnswers.filter(a => a.is_correct).length,
          wrongAnswers: attemptedAnswers.filter(a => !a.is_correct).length,
          unansweredQuestions: totalQuestions - attemptedAnswers.length,
          totalMarks: testAttempt.final_score,
          maxPossibleMarks: totalQuestions * scoringRule.marks_correct,
          correctMarks: attemptedAnswers.filter(a => a.is_correct).length * scoringRule.marks_correct,
          negativeMarks: attemptedAnswers.filter(a => !a.is_correct).length * Math.abs(scoringRule.marks_incorrect),
          unansweredMarks: (totalQuestions - attemptedAnswers.length) * scoringRule.marks_unanswered
        };

        setTestData(testAttempt.test);
        setAttemptStats(stats);
        setSolutions(allSolutions);

      } catch (error) {
        console.error('Error fetching solutions:', error);
        setError(error.message);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth to be checked before proceeding
    if (authLoading) {
      return; // Don't do anything while auth is loading
    }

    // Only redirect if auth is finished loading and there's no user
    if (!authLoading && !user) {
      console.log('Auth finished loading, no user found');
      navigate('/login');
      return;
    }

    // Only fetch solutions if we have a user
    if (user) {
      fetchSolutions();
    }

  }, [attemptId, user, navigate, authLoading, testId]); // Add authLoading to dependencies

  // Show loading screen while auth is being checked
  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen />;
  }

  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <div style={styles.content}>
        <h1 style={styles.title}>Test Results</h1>

        {/* Statistics Section */}
        <div style={styles.statsSection}>
          <h2 style={styles.sectionTitle}>Test Statistics</h2>
          <div style={styles.statsGrid}>
            <StatItem label="Total Questions" value={attemptStats.totalQuestions} />
            <StatItem label="Attempted" value={attemptStats.attemptedQuestions} />
            <StatItem 
              label="Correct" 
              value={`${attemptStats.correctAnswers} (+${attemptStats.correctMarks})`}
              valueStyle={styles.correctText}
            />
            <StatItem 
              label="Wrong" 
              value={`${attemptStats.wrongAnswers} (-${attemptStats.negativeMarks})`}
              valueStyle={styles.wrongText}
            />
            <StatItem 
              label="Unanswered" 
              value={`${attemptStats.unansweredQuestions} (${attemptStats.unansweredMarks})`}
            />
            <StatItem 
              label="Final Score" 
              value={`${attemptStats.totalMarks}/${attemptStats.maxPossibleMarks}`}
              valueStyle={styles.scoreText}
            />
          </div>
        </div>

        {/* Solutions Section */}
        <div style={styles.solutionsSection}>
          <h2 style={styles.sectionTitle}>Detailed Solutions</h2>
          {solutions.map((solution, index) => (
            <div key={solution.id} style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <h3 style={styles.questionNumber}>Question {index + 1}</h3>
                <span style={
                  solution.is_attempted 
                    ? (solution.is_correct ? styles.correctBadge : styles.wrongBadge)
                    : styles.unansweredBadge
                }>
                  {solution.is_attempted 
                    ? (solution.is_correct ? 'Correct' : 'Wrong')
                    : 'Not Attempted'}
                </span>
              </div>
              
              <p style={styles.questionText}>{solution.question_text}</p>
              
              <div style={styles.optionsContainer}>
                {solution.question_options.map(option => (
                  <div 
                    key={option.id} 
                    style={{
                      ...styles.option,
                      ...(option.id === solution.selected_option_id && styles.selectedOption),
                      ...(option.is_correct && styles.correctOption)
                    }}
                  >
                    <span style={styles.optionText}>{option.option_text}</span>
                    {option.id === solution.selected_option_id && (
                      <span style={styles.yourChoice}>Your Choice</span>
                    )}
                    {option.is_correct && (
                      <span style={styles.correctAnswer}>Correct Answer</span>
                    )}
                  </div>
                ))}
              </div>

              {solution.explanation && (
                <div style={styles.explanation}>
                  <h4 style={styles.explanationTitle}>Solution:</h4>
                  <p style={styles.explanationText}>{solution.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, valueStyle }) => (
  <div style={styles.statItem}>
    <span style={styles.statLabel}>{label}</span>
    <span style={{ ...styles.statValue, ...valueStyle }}>{value}</span>
  </div>
);

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
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
  title: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#111827',
  },
  statsSection: {
    marginBottom: '32px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#2d3748',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
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
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
  },
  correctText: {
    color: '#38a169',
  },
  wrongText: {
    color: '#e53e3e',
  },
  scoreText: {
    color: '#3182ce',
  },
  solutionsSection: {
    marginTop: '32px',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  questionNumber: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  correctBadge: {
    backgroundColor: '#38a16920',
    color: '#38a169',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '500',
  },
  wrongBadge: {
    backgroundColor: '#e53e3e20',
    color: '#e53e3e',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '500',
  },
  questionText: {
    fontSize: '16px',
    color: '#2d3748',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  option: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  selectedOption: {
    backgroundColor: '#ebf8ff',
    borderColor: '#90cdf4',
  },
  correctOption: {
    backgroundColor: '#f0fff4',
    borderColor: '#68d391',
  },
  optionText: {
    flex: 1,
    fontSize: '15px',
    color: '#2d3748',
  },
  yourChoice: {
    backgroundColor: '#90cdf4',
    color: '#2c5282',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    marginLeft: '8px',
  },
  correctAnswer: {
    backgroundColor: '#68d391',
    color: '#276749',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    marginLeft: '8px',
  },
  explanation: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  explanationTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  explanationText: {
    fontSize: '15px',
    color: '#4a5568',
    lineHeight: '1.6',
    margin: 0,
  },
  error: {
    padding: '20px',
    backgroundColor: '#fff5f5',
    color: '#c53030',
    borderRadius: '8px',
    textAlign: 'center',
    margin: '20px auto',
    maxWidth: '600px',
  },
  unansweredBadge: {
    backgroundColor: '#71717a20',
    color: '#71717a',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default TestSolution; 