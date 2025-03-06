import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchTestDetails();
    fetchQuestions();
  }, [testId]);

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

        // Check for existing in-progress test
        const { data: existingTest, error: existingError } = await supabase
          .from('user_tests')
          .select('id, status')
          .eq('exam_test_id', testId)
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
            exam_test_id: testId,
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
  }, [testId, navigate]);

  // Set up countdown timer when test data is loaded
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
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      console.log("Fetching questions for test:", testId);
      
      // Check if testId is valid
      if (!testId) {
        console.error("Invalid testId:", testId);
        setLoading(false);
        return;
      }
      
      // First, verify the test exists
      const { data: testExists, error: testExistsError } = await supabase
        .from('exam_tests')
        .select('id, exam_id, test_name')
        .eq('id', testId)
        .single();
        
      if (testExistsError) {
        console.error('Error verifying test exists:', testExistsError);
        setLoading(false);
        return;
      }
      
      if (!testExists) {
        console.error('Test not found with ID:', testId);
        setLoading(false);
        return;
      }
      
      console.log("Test exists:", testExists);
      
      // Get the test questions from the junction table
      const { data: testQuestions, error: testQuestionsError } = await supabase
        .from('exam_test_questions')
        .select('question_id, question_order')
        .eq('exam_test_id', testId);
        
      if (testQuestionsError) {
        console.error('Error fetching test questions:', testQuestionsError);
        setLoading(false);
        return;
      }
      
      console.log("Test questions from junction table:", testQuestions);
      
      // If no questions are found, try to create some
      if (!testQuestions || testQuestions.length === 0) {
        console.log("No questions found for this test. Attempting to create test questions...");
        
        // Get questions for this exam
        const { data: examQuestions, error: examQuestionsError } = await supabase
          .from('questions')
          .select('id, question_text')
          .eq('exam_id', testExists.exam_id)
          .eq('is_active', true)
          .limit(10);
          
        if (examQuestionsError) {
          console.error('Error fetching exam questions:', examQuestionsError);
          setLoading(false);
          return;
        }
        
        console.log("Found exam questions:", examQuestions);
        
        if (!examQuestions || examQuestions.length === 0) {
          console.log("No questions found for this exam. Creating a sample question...");
          
          // Create a sample question for testing
          const { data: sampleQuestion, error: sampleQuestionError } = await supabase
            .from('questions')
            .insert([{
              exam_id: testExists.exam_id,
              question_text: 'Sample question for testing',
              choices: { 'A': 'Option A', 'B': 'Option B', 'C': 'Option C', 'D': 'Option D' },
              correct_answer: 'A',
              is_active: true
            }])
            .select();
            
          if (sampleQuestionError) {
            console.error('Error creating sample question:', sampleQuestionError);
            setLoading(false);
            return;
          }
            
          console.log("Created sample question:", sampleQuestion);
            
          if (!sampleQuestion || sampleQuestion.length === 0) {
            console.error("Failed to create sample question");
            setLoading(false);
            return;
          }
            
          // Add the sample question to the test
          const { data: testQuestion, error: testQuestionError } = await supabase
            .from('exam_test_questions')
            .insert([{
              exam_test_id: testId,
              question_id: sampleQuestion[0].id,
              question_order: 1
            }])
            .select();
            
          if (testQuestionError) {
            console.error('Error adding sample question to test:', testQuestionError);
            setLoading(false);
            return;
          }
            
          console.log("Added sample question to test:", testQuestion);
            
          // Set the questions array with the sample question
          setQuestions(sampleQuestion);
          setLoading(false);
          return;
        }
        
        // Create test questions
        const testQuestionsToInsert = examQuestions.map((q, index) => ({
          exam_test_id: testId,
          question_id: q.id,
          question_order: index + 1
        }));
        
        console.log("Inserting test questions:", testQuestionsToInsert);
        
        const { data: insertedQuestions, error: insertError } = await supabase
          .from('exam_test_questions')
          .insert(testQuestionsToInsert)
          .select();
          
        if (insertError) {
          console.error('Error creating test questions:', insertError);
          setLoading(false);
          return;
        }
        
        console.log("Created test questions:", insertedQuestions);
        
        // Set the questions array with the exam questions
        setQuestions(examQuestions);
        setLoading(false);
        return;
      }
      
      // If we have test questions, get the question details
      const questionIds = testQuestions.map(q => q.question_id);
      console.log("Question IDs to fetch:", questionIds);
      
      if (questionIds.length === 0) {
        console.error("No question IDs found");
        setLoading(false);
        return;
      }
      
      const { data: questionDetails, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);
        
      if (questionsError) {
        console.error('Error fetching question details:', questionsError);
        setLoading(false);
        return;
      }
      
      console.log("Question details fetched:", questionDetails);
      
      if (!questionDetails || questionDetails.length === 0) {
        console.error("No question details found for IDs:", questionIds);
        setLoading(false);
        return;
      }
      
      // Set the questions array
      setQuestions(questionDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchQuestions:', error);
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = async (questionId, answer) => {
    try {
      console.log('Saving answer:', { questionId, answer, currentTestId });
      
      if (!currentTestId) {
        console.error('No current test ID found');
        return;
      }

      // Update local state
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));

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

      console.log('Answer saved successfully');
    } catch (error) {
      console.error('Error in handleAnswerSelect:', error);
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

  const handleFinishTest = async () => {
    try {
      setIsSubmitting(true);
      console.log('Starting test submission...', { currentTestId });

      if (!currentTestId) {
        throw new Error('No active test found');
      }

      // Calculate final score
      const { data: answers, error: answersError } = await supabase
        .from('user_test_questions')
        .select('is_correct')
        .eq('user_test_id', currentTestId);

      if (answersError) throw answersError;

      const totalQuestions = questions.length;
      const answeredQuestions = Object.keys(selectedAnswers).length;
      const correctAnswers = answers?.filter(a => a.is_correct)?.length || 0;
      const scorePercentage = (correctAnswers / totalQuestions) * 100;

      console.log('Calculated score:', {
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        scorePercentage
      });

      // Update test status
      const { error: updateError } = await supabase
        .from('user_tests')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString(),
          score: scorePercentage,
          total_questions_answered: answeredQuestions,
          time_taken: Math.round((new Date() - new Date(testData?.start_time)) / 60000) // minutes
        })
        .eq('id', currentTestId);

      if (updateError) throw updateError;

      console.log('Test completed successfully');
      navigate(`/test/${testId}/results/${currentTestId}`);
      
    } catch (error) {
      console.error('Error in handleFinishTest:', error);
      alert(`Failed to submit test: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // This is the function for the Finish button that appears on last question
  const handleLastQuestionFinish = async () => {
    try {
      setIsSubmitting(true);
      console.log('Last question finish button clicked');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User data:', user);
      
      if (userError || !user) {
        throw new Error(userError?.message || 'No user found');
      }

      const { data: userTests, error: userTestError } = await supabase
        .from('user_tests')
        .select('*')
        .eq('exam_test_id', testId)
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
      console.error('Error in handleLastQuestionFinish:', error);
      alert(`Failed to submit test: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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
                    onClick={() => handleAnswerSelect(questions[currentQuestion].id, key)}
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