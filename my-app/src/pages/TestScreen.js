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
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestDetails();
    fetchQuestions();
  }, [testId]);

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

  const handleAnswerSelect = (optionKey) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: optionKey
    });
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
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }
      
      // Calculate results
      const attempted = Object.keys(selectedAnswers).length;
      const correct = Object.entries(selectedAnswers).filter(([qIndex, answer]) => {
        const question = questions[parseInt(qIndex)];
        // Compare the selected answer with the correct answer
        if (!question || !question.correct_answer) return false;
        
        // Handle different formats of correct_answer
        if (typeof question.correct_answer === 'string') {
          return question.correct_answer === answer;
        } else if (Array.isArray(question.correct_answer)) {
          return question.correct_answer.includes(answer);
        } else if (typeof question.correct_answer === 'object') {
          return question.correct_answer[answer] === true;
        }
        return false;
      }).length;
      
      const score = correct;
      
      // Find the user_test entry for this test
      const { data: userTest, error: userTestError } = await supabase
        .from('user_tests')
        .select('id')
        .eq('exam_test_id', testId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .single();
        
      if (userTestError) {
        console.error('Error finding user test:', userTestError);
        throw userTestError;
      }
      
      // Update the user_test entry
      const { error: updateError } = await supabase
        .from('user_tests')
        .update({
          status: 'completed',
          score: score,
          end_time: new Date().toISOString(),
          time_taken: testData.duration * 60 - timeRemaining,
          total_questions_answered: attempted
        })
        .eq('id', userTest.id);

      if (updateError) {
        console.error('Error updating user test:', updateError);
        throw updateError;
      }

      // Navigate to results page
      navigate(`/test/${testId}/result`, {
        state: {
          score,
          totalQuestions: questions.length,
          attempted,
          correct,
          wrong: attempted - correct
        }
      });
    } catch (error) {
      console.error('Error finishing test:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={typography.textLgMedium}>Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={typography.displaySmBold}>No Questions Found</h2>
          <p style={typography.textMdRegular}>
            This test doesn't have any questions yet.
          </p>
          <button 
            onClick={() => navigate(-1)} 
            style={styles.backButton}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];

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
        
        {/* Finish button */}
        <button 
          style={styles.finishButton}
          onClick={() => setShowFinishModal(true)}
        >
          Finish Test
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
                    ...(selectedAnswers[currentQuestion] === key && styles.selectedOption)
                  }}
                  onClick={() => handleAnswerSelect(key)}
                >
                  <span style={styles.optionKey}>{key}</span>
                  <span style={styles.optionText}>{value}</span>
                </button>
              ))}
              
              {(!questions[currentQuestion]?.choices || 
                Object.keys(questions[currentQuestion]?.choices || {}).length === 0) && (
                <p>No options available for this question</p>
              )}
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
              onClick={handleNext}
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
    borderRadius: '20px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    ...typography.textSmBold,
    cursor: 'pointer',
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
    backgroundColor: colors.backgroundPrimary,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    ...typography.textMdRegular,
  },
  optionKey: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: colors.backgroundSecondary,
    ...typography.textSmBold,
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
  },
  selectedOption: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '12px',
    border: `1px solid ${colors.brandPrimary}`,
    backgroundColor: colors.backgroundPrimary,
    color: colors.brandPrimary,
    cursor: 'pointer',
    ...typography.textMdBold,
  },
  confirmButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    cursor: 'pointer',
    ...typography.textMdBold,
  },
};

export default TestScreen; 