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
  const [time, setTime] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
    const timer = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [testId]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId);
      
      if (error) throw error;
      setQuestions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: optionIndex
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
      // Calculate results
      const attempted = Object.keys(selectedAnswers).length;
      const correct = Object.entries(selectedAnswers).filter(([qIndex, answer]) => 
        questions[qIndex].correct_answer === answer
      ).length;
      const wrong = attempted - correct;
      const score = correct * (questions[0]?.marks_per_question || 1); // Assuming each question has same marks

      // Save results to database
      const { error } = await supabase
        .from('user_tests')
        .update({
          status: 'completed',
          score: score,
          completed_at: new Date().toISOString(),
          attempted: attempted,
          correct: correct,
          wrong: wrong
        })
        .eq('test_id', testId)
        .eq('status', 'in_progress');

      if (error) throw error;

      // Navigate to results page
      navigate(`/test/${testId}/result`, {
        state: {
          score,
          totalQuestions: questions.length,
          attempted,
          correct,
          wrong
        }
      });
    } catch (error) {
      console.error('Error finishing test:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const currentQuestionData = questions[currentQuestion];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ←
        </button>
        <button 
          onClick={() => setShowFinishModal(true)} 
          style={styles.finishButton}
        >
          Finish test
        </button>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressInfo}>
        <span style={{...typography.textMdRegular, color: colors.brandPrimary}}>
          Time {formatTime(time)}
        </span>
        <span style={{...typography.textMdRegular, color: colors.brandPrimary}}>
          {currentQuestion + 1}/{questions.length}
        </span>
      </div>

      {/* Question */}
      <div style={styles.questionContainer}>
        <h2 style={typography.textLgBold}>Question {currentQuestion + 1}</h2>
        <p style={{...typography.textMdRegular, marginTop: '12px'}}>
          {currentQuestionData?.question_text}
        </p>

        {/* Options */}
        <div style={styles.optionsContainer}>
          {['A', 'B', 'C', 'D'].map((option, index) => (
            <button
              key={option}
              style={{
                ...styles.optionButton,
                ...(selectedAnswers[currentQuestion] === index && styles.selectedOption)
              }}
              onClick={() => handleAnswerSelect(index)}
            >
              {option}: {currentQuestionData?.[`option_${option.toLowerCase()}`]}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={styles.navigationButtons}>
        <button
          onClick={handlePrevious}
          style={{...styles.navButton, visibility: currentQuestion === 0 ? 'hidden' : 'visible'}}
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          style={{...styles.navButton, backgroundColor: colors.brandPrimary}}
        >
          Next
        </button>
      </div>

      {/* Finish Modal */}
      {showFinishModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={typography.textLgBold}>Finish Test?</h3>
            <p style={{...typography.textMdRegular, color: colors.textSecondary, margin: '16px 0'}}>
              Are you sure you want to finish the test? You can't undo this action.
            </p>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowFinishModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleFinishTest}
                style={styles.confirmButton}
              >
                Yes, finish test
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
  finishButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
    border: 'none',
    ...typography.textSmBold,
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
    ...typography.textMdRegular,
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