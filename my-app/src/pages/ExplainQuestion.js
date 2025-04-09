import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaQuestion, FaSearch, FaRobot, FaUsers, FaClipboardList, FaBook, FaGraduationCap, FaCalculator, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import LoadingScreen from '../components/LoadingScreen';

const ExplainQuestion = () => {
  const navigate = useNavigate();
  const [questionId, setQuestionId] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);

  // Fetch some recent questions if available
  useEffect(() => {
    const fetchRecentQuestions = async () => {
      try {
        setFetchingQuestions(true);
        
        // Try to fetch a few recent questions for the examples
        // Adjust this endpoint to match what's available in your API
        const response = await fetch('/api/chatbot/recent-questions?limit=5');
        
        if (response.ok) {
          const data = await response.json();
          setRecentQuestions(data);
        } else {
          console.log('Could not fetch recent questions - this is optional functionality');
          // Not setting an error - this is an enhancement, not critical functionality
        }
      } catch (error) {
        console.log('Error fetching recent questions:', error);
      } finally {
        setFetchingQuestions(false);
      }
    };

    fetchRecentQuestions();
  }, []);

  const handleQuestionIdChange = (e) => {
    setQuestionId(e.target.value);
    setError(null);
  };

  const handleGenerateExplanation = async () => {
    if (!questionId) {
      setError("Please enter a question ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setExplanation('');

      const response = await fetch('/api/chatbot/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question_id: parseInt(questionId) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate explanation");
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      setError(error.message || "Failed to generate explanation");
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (id) => {
    setQuestionId(id);
    setError(null);
  };

  return (
    <Container>
      <Sidebar>
        <SidebarHeader>
          <h1>Admin</h1>
        </SidebarHeader>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaClipboardList /> Dashboard
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaUsers /> Users
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaGraduationCap /> Exams
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaClipboardList /> Tests
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaQuestion /> Questions
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaBook /> Subjects
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaBook /> Topics
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaCalculator /> Scoring Rules
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaRobot /> AI Ingestion Tool
        </NavItem>
        
        <NavItem active onClick={() => navigate('/explain-question')}>
          <FaQuestion /> AI Explanation Tool
        </NavItem>
        
        <NavItem onClick={() => navigate('/upload-questions')}>
          <FaUpload /> Upload Questions
        </NavItem>
        
        <BackButton onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back to Dashboard
        </BackButton>
      </Sidebar>
      
      <Content>
        <Header>
          <h1>AI Explanation Tool</h1>
        </Header>
        
        <ContentArea>
          <CardContainer>
            <ExplanationCard>
              <h2>Generate AI Explanation</h2>
              <Description>
                This tool uses AI to create clear, detailed explanations for questions in your database.
              </Description>
              
              <InputContainer>
                <Label htmlFor="question-id">Question ID</Label>
                <Input 
                  id="question-id"
                  type="number"
                  placeholder="Enter question ID"
                  value={questionId}
                  onChange={handleQuestionIdChange}
                />
              </InputContainer>
              
              <GenerateButton 
                id="generate-button"
                onClick={handleGenerateExplanation} 
                disabled={loading || !questionId}
              >
                {loading ? 'Generating...' : 'Generate Explanation'}
              </GenerateButton>
              
              {loading && <LoadingMessage>Generating explanation using AI... This may take a few seconds.</LoadingMessage>}
              
              {error && (
                <ErrorContainer>
                  {error}
                </ErrorContainer>
              )}
              
              {explanation && (
                <ResultContainer>
                  <h3>Generated Explanation</h3>
                  <ExplanationText>{explanation}</ExplanationText>
                </ResultContainer>
              )}
            </ExplanationCard>
            
            <InfoCard>
              <h3>About This Tool</h3>
              <p>
                The AI Explanation Tool helps you generate high-quality explanations for your test questions.
              </p>
              
              <InfoBox>
                <h4>How It Works</h4>
                <ol>
                  <li>Enter the ID of the question you need explained</li>
                  <li>Click "Generate Explanation"</li>
                  <li>The AI will analyze the question and create a detailed explanation</li>
                  <li>Review and use the explanation in your tests</li>
                </ol>
              </InfoBox>
              
              <InfoBox warning>
                <h4>Notes</h4>
                <ul>
                  <li>This tool works best with clearly formulated questions</li>
                  <li>For complex questions, you may need to edit the generated explanation</li>
                  <li>The explanation is automatically saved to the question in the database</li>
                </ul>
              </InfoBox>
              
              {recentQuestions.length > 0 && (
                <ExamplesBox>
                  <h4>Recent Questions</h4>
                  <p>Click on a question ID to generate an explanation:</p>
                  <ExamplesList>
                    {recentQuestions.map(q => (
                      <ExampleItem 
                        key={q.id} 
                        onClick={() => handleExampleClick(q.id)}
                        selected={questionId === q.id.toString()}
                      >
                        <ExampleId>{q.id}</ExampleId>
                        <ExampleText>{q.question_text}</ExampleText>
                      </ExampleItem>
                    ))}
                  </ExamplesList>
                </ExamplesBox>
              )}
              
              {fetchingQuestions && <p>Loading recent questions...</p>}
            </InfoCard>
          </CardContainer>
        </ContentArea>
      </Content>
    </Container>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f8f9fa;
`;

const Sidebar = styled.div`
  width: 250px;
  background-color: ${colors.brandPrimary};
  color: white;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
  
  h1 {
    ${typography.textXlBold};
    margin: 0;
  }
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  ${typography.textMdMedium};
  background-color: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin-top: auto;
  cursor: pointer;
  ${typography.textMdMedium};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  
  h1 {
    ${typography.textXlBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const ContentArea = styled.div`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
`;

const CardContainer = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ExplanationCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  h2 {
    margin-top: 0;
    color: ${colors.textPrimary};
  }
`;

const InfoCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  h3 {
    margin-top: 0;
    color: ${colors.textPrimary};
  }
  
  p {
    color: #4b5563;
    line-height: 1.5;
  }
`;

const Description = styled.p`
  color: #4b5563;
  margin-bottom: 24px;
`;

const InputContainer = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 16px;
  margin-bottom: 16px;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }
`;

const GenerateButton = styled.button`
  display: inline-block;
  padding: 12px 20px;
  background-color: ${props => props.disabled ? '#9ca3af' : colors.brandPrimary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.disabled ? '#9ca3af' : colors.brandPrimaryDark};
  }
`;

const LoadingMessage = styled.p`
  margin-top: 16px;
  color: #6b7280;
  font-style: italic;
`;

const ErrorContainer = styled.div`
  background-color: #fee2e2;
  padding: 12px;
  border-radius: 4px;
  margin-top: 20px;
  color: #b91c1c;
`;

const ResultContainer = styled.div`
  margin-top: 30px;
  padding: 20px;
  background-color: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid ${colors.brandPrimary};
  
  h3 {
    margin-top: 0;
    color: ${colors.textPrimary};
  }
`;

const ExplanationText = styled.p`
  white-space: pre-wrap;
  line-height: 1.6;
  color: #374151;
`;

const InfoBox = styled.div`
  margin-top: 20px;
  padding: 16px;
  border-radius: 6px;
  background-color: ${props => props.warning ? '#fff7ed' : '#f3f4f6'};
  border-left: 4px solid ${props => props.warning ? '#f59e0b' : colors.brandPrimary};
  
  h4 {
    margin-top: 0;
    margin-bottom: 10px;
    color: ${props => props.warning ? '#92400e' : colors.textPrimary};
  }
  
  ul, ol {
    margin: 0;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 6px;
  }
`;

const ExamplesBox = styled.div`
  margin-top: 24px;
  
  h4 {
    margin-top: 0;
    margin-bottom: 12px;
  }
  
  p {
    margin-bottom: 12px;
  }
`;

const ExamplesList = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
`;

const ExampleItem = styled.div`
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  background-color: ${props => props.selected ? '#eff6ff' : 'white'};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.selected ? '#eff6ff' : '#f9fafb'};
  }
`;

const ExampleId = styled.div`
  min-width: 40px;
  font-weight: 600;
  color: ${colors.brandPrimary};
`;

const ExampleText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default ExplainQuestion; 