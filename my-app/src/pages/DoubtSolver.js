import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaArrowLeft, FaRobot, FaSpinner, FaPaperPlane } from 'react-icons/fa';
import SidebarLayout from '../components/layout/SidebarLayout';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import ReactMarkdown from 'react-markdown';

const DoubtSolver = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const navigate = useNavigate();

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/chat/doubt', {
        query: query.trim(),
        include_sources: true
      });
      
      setAnswer(response.data.answer);
      if (response.data.sources) {
        setSources(response.data.sources);
      }
    } catch (err) {
      console.error('Error fetching answer:', err);
      setError(err.response?.data?.detail || 'Failed to get an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <Container>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </BackButton>
          <Title>SSC CGL Doubt Solver</Title>
        </Header>
        
        <Content>
          <InfoCard>
            <FaRobot size={24} color={colors.brandPrimary} />
            <InfoTitle>Ask Your SSC CGL Questions</InfoTitle>
            <InfoText>
              Get expert answers to your questions about SSC CGL exam preparation, 
              syllabus, important topics, and strategies.
            </InfoText>
          </InfoCard>
          
          <QueryForm onSubmit={handleSubmit}>
            <QueryInput 
              value={query}
              onChange={handleQueryChange}
              placeholder="e.g., What topics should I focus on for Quantitative Aptitude?"
              disabled={loading}
            />
            <SubmitButton type="submit" disabled={loading || !query.trim()}>
              {loading ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
              {loading ? 'Thinking...' : 'Ask Question'}
            </SubmitButton>
          </QueryForm>
          
          {error && (
            <ErrorMessage>
              <p>{error}</p>
            </ErrorMessage>
          )}
          
          {answer && (
            <AnswerContainer>
              <AnswerTitle>Answer:</AnswerTitle>
              <AnswerContent>
                <ReactMarkdown>{answer}</ReactMarkdown>
              </AnswerContent>
            </AnswerContainer>
          )}
          
          <SuggestedQuestions>
            <SuggestedTitle>Try asking about:</SuggestedTitle>
            <SuggestedList>
              <SuggestedItem onClick={() => setQuery("What are the most important topics for Tier I exam?")}>
                What are the most important topics for Tier I exam?
              </SuggestedItem>
              <SuggestedItem onClick={() => setQuery("How should I prepare for the reasoning section?")}>
                How should I prepare for the reasoning section?
              </SuggestedItem>
              <SuggestedItem onClick={() => setQuery("What is the eligibility criteria for SSC CGL?")}>
                What is the eligibility criteria for SSC CGL?
              </SuggestedItem>
            </SuggestedList>
          </SuggestedQuestions>
        </Content>
      </Container>
    </SidebarLayout>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8fafc;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${colors.textSecondary};
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${colors.textPrimary};
  }
`;

const Title = styled.h1`
  ${typography.textXlBold};
  color: ${colors.textPrimary};
  margin: 0;
`;

const Content = styled.main`
  flex: 1;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const InfoCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const InfoTitle = styled.h2`
  ${typography.textLgBold};
  color: ${colors.textPrimary};
  margin: 16px 0 8px;
`;

const InfoText = styled.p`
  ${typography.textMdRegular};
  color: ${colors.textSecondary};
  margin: 0;
`;

const QueryForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  
  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const QueryInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  ${typography.textMdRegular};
  outline: none;
  
  &:focus {
    border-color: ${colors.brandPrimary};
    box-shadow: 0 0 0 2px ${colors.brandPrimaryLight};
  }
  
  &:disabled {
    background-color: #f1f5f9;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background-color: ${props => props.disabled ? '#94a3b8' : colors.brandPrimary};
  color: white;
  border: none;
  border-radius: 8px;
  ${typography.textMdBold};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: ${colors.brandPrimaryDark};
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background-color: #fee2e2;
  border-radius: 8px;
  margin-bottom: 24px;
  
  p {
    ${typography.textSmMedium};
    color: #b91c1c;
    margin: 0;
  }
`;

const AnswerContainer = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const AnswerTitle = styled.h3`
  ${typography.textMdBold};
  color: ${colors.textPrimary};
  margin: 0 0 16px;
`;

const AnswerContent = styled.div`
  ${typography.textMdRegular};
  color: ${colors.textPrimary};
  line-height: 1.6;
  
  p {
    margin-bottom: 16px;
  }
  
  ul, ol {
    margin-bottom: 16px;
    padding-left: 24px;
  }
  
  li {
    margin-bottom: 8px;
  }
`;

const SuggestedQuestions = styled.div`
  background-color: #f1f5f9;
  border-radius: 12px;
  padding: 16px;
`;

const SuggestedTitle = styled.h3`
  ${typography.textSmBold};
  color: ${colors.textSecondary};
  margin: 0 0 12px;
`;

const SuggestedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SuggestedItem = styled.button`
  text-align: left;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  ${typography.textSmRegular};
  color: ${colors.textPrimary};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f8fafc;
    border-color: ${colors.brandPrimary};
  }
`;

export default DoubtSolver; 