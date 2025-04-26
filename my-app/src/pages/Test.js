import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaClock, FaCheck, FaTimes, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useParams, useNavigate } from 'react-router-dom';

const Test = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(null);
  const [testId, setTestId] = useState(null);

  // Load test data
  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        
        // Use the ID from the URL parameters
        const testIdToFetch = id || 1; // Fallback to 1 if no ID provided
        setTestId(testIdToFetch);
        
        const { data, error } = await supabase
          .from('tests')
          .select('*, questions(*)')
          .eq('id', testIdToFetch)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setTest(data);
          // Initialize timer
          setTimeRemaining(data.duration * 60); // Convert minutes to seconds
          // Initialize answer object with empty answers
          const initialAnswers = {};
          data.questions.forEach(q => {
            initialAnswers[q.id] = null;
          });
          setAnswers(initialAnswers);
        }
      } catch (error) {
        console.error('Error fetching test:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTestData();
  }, [id]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && !testCompleted) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timeRemaining, testCompleted]);

  const submitTest = async () => {
    setTestCompleted(true);
    
    // Calculate score
    let correctAnswers = 0;
    test.questions.forEach(question => {
      if (answers[question.id] === question.correct_answer) {
        correctAnswers++;
      }
    });
    
    const finalScore = (correctAnswers / test.questions.length) * 100;
    setScore(finalScore);
    
    // Save test result to database
    try {
      const { error } = await supabase
        .from('test_results')
        .insert({
          user_id: user.id,
          test_id: testId,
          score: finalScore,
          answers: answers,
          completed_at: new Date().toISOString()
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  };

  const handleSelectAnswer = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <SidebarLayout>
        <LoadingContainer>
          <LoadingText>Loading test...</LoadingText>
        </LoadingContainer>
      </SidebarLayout>
    );
  }

  if (!test) {
    return (
      <SidebarLayout>
        <ErrorContainer>
          <h2>Test not found</h2>
          <p>The requested test could not be loaded.</p>
        </ErrorContainer>
      </SidebarLayout>
    );
  }

  if (testCompleted) {
    return (
      <SidebarLayout>
        <TestContainer>
          <TestHeader>
            <h1>Test Completed</h1>
          </TestHeader>
          <ResultsContainer>
            <h2>Your Score: {score.toFixed(1)}%</h2>
            <ScoreMessage score={score}>
              {score >= 80 ? 'Excellent work!' : 
               score >= 60 ? 'Good job!' : 
               'Keep practicing!'}
            </ScoreMessage>
            <ResultsSummary>
              <p>Test: {test.title}</p>
              <p>Questions: {test.questions.length}</p>
              <p>Correct Answers: {Math.round((score / 100) * test.questions.length)}</p>
            </ResultsSummary>
            <ButtonContainer>
              <PrimaryButton onClick={() => navigate('/practice-tests')}>
                Back to Practice Tests
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/my-progress')}>
                View My Progress
              </SecondaryButton>
            </ButtonContainer>
          </ResultsContainer>
        </TestContainer>
      </SidebarLayout>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];

  return (
    <SidebarLayout>
      <TestContainer>
        <TestHeader>
          <h1>{test.title}</h1>
          <TestInfo>
            <TimerContainer>
              <FaClock /> {formatTime(timeRemaining)}
            </TimerContainer>
            <QuestionsProgress>
              Question {currentQuestionIndex + 1} of {test.questions.length}
            </QuestionsProgress>
          </TestInfo>
        </TestHeader>
        
        <QuestionContainer>
          <QuestionText>{currentQuestion.question_text}</QuestionText>
          
          <AnswerOptions>
            {currentQuestion.options.map((option, index) => (
              <AnswerOption 
                key={index}
                selected={answers[currentQuestion.id] === index}
                onClick={() => handleSelectAnswer(currentQuestion.id, index)}
              >
                <OptionIndex>{String.fromCharCode(65 + index)}</OptionIndex>
                <OptionText>{option}</OptionText>
                {answers[currentQuestion.id] === index && (
                  <SelectedIndicator>
                    <FaCheck />
                  </SelectedIndicator>
                )}
              </AnswerOption>
            ))}
          </AnswerOptions>
        </QuestionContainer>
        
        <NavigationContainer>
          <NavigationButton onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0}>
            <FaChevronLeft /> Previous
          </NavigationButton>
          
          {currentQuestionIndex === test.questions.length - 1 ? (
            <SubmitButton onClick={submitTest}>
              Submit Test
            </SubmitButton>
          ) : (
            <NavigationButton onClick={goToNextQuestion}>
              Next <FaChevronRight />
            </NavigationButton>
          )}
        </NavigationContainer>
        
        <TestProgress>
          {test.questions.map((_, index) => (
            <ProgressDot 
              key={index}
              active={index === currentQuestionIndex}
              answered={answers[test.questions[index].id] !== null}
              onClick={() => setCurrentQuestionIndex(index)}
            />
          ))}
        </TestProgress>
      </TestContainer>
    </SidebarLayout>
  );
};

const TestContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  min-height: 80vh;
`;

const TestHeader = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    color: #333;
  }
`;

const TestInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f5f7fa;
  border-radius: 8px;
`;

const TimerContainer = styled.div`
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: #e63946;
  
  svg {
    margin-right: 8px;
  }
`;

const QuestionsProgress = styled.div`
  font-size: 1rem;
  color: #555;
`;

const QuestionContainer = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  flex-grow: 1;
`;

const QuestionText = styled.h2`
  font-size: 1.3rem;
  margin-bottom: 1.5rem;
  line-height: 1.4;
  color: #333;
`;

const AnswerOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AnswerOption = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? '#4361ee' : '#e1e5eb'};
  background-color: ${props => props.selected ? '#ebf0ff' : '#fff'};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: #f0f7ff;
    border-color: #4361ee;
  }
`;

const OptionIndex = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #4361ee;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-right: 1rem;
`;

const OptionText = styled.div`
  flex-grow: 1;
  font-size: 1rem;
`;

const SelectedIndicator = styled.div`
  color: #4361ee;
  margin-left: 1rem;
  
  svg {
    font-size: 1.2rem;
  }
`;

const NavigationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const NavigationButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #f0f2f5;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e1e5eb;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 2rem;
  background-color: #4361ee;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #3a56d4;
  }
`;

const TestProgress = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ProgressDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => 
    props.active ? '#4361ee' : 
    props.answered ? '#a2d2ff' : '#ddd'
  };
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.2);
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 70vh;
`;

const LoadingText = styled.h2`
  color: #4361ee;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 70vh;
  
  h2 {
    color: #e63946;
    margin-bottom: 1rem;
  }
`;

const ResultsContainer = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  
  h2 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    color: #333;
  }
`;

const ScoreMessage = styled.p`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: ${props => 
    props.score >= 80 ? '#2a9d8f' : 
    props.score >= 60 ? '#e9c46a' : 
    '#e76f51'
  };
`;

const ResultsSummary = styled.div`
  padding: 1.5rem;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 2rem;
  
  p {
    margin: 0.5rem 0;
    font-size: 1rem;
    color: #555;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const PrimaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #4361ee;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #3a56d4;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #f0f2f5;
  color: #333;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e1e5eb;
  }
`;

export default Test; 