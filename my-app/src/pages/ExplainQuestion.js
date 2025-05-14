import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaQuestion, FaSearch, FaRobot, FaUsers, FaClipboardList, FaBook, FaGraduationCap, FaCalculator, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../config/supabaseClient';

const ExplainQuestion = () => {
  const navigate = useNavigate();
  const [questionId, setQuestionId] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionMode, setSelectionMode] = useState('id'); // 'id' or 'browse'
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Fetch questions if browse mode is selected
  useEffect(() => {
    if (selectionMode === 'browse' && questions.length === 0) {
      fetchQuestions();
    }
  }, [selectionMode]);

  // Filter questions based on search term and subject
  useEffect(() => {
    if (questions.length > 0) {
      let filtered = [...questions];
      
      // Filter by subject
      if (selectedSubject) {
        filtered = filtered.filter(q => q.subject_name === selectedSubject);
      }
      
      // Filter by search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(q => 
          q.question_text.toLowerCase().includes(term) || 
          q.id.toString().includes(term)
        );
      }
      
      setFilteredQuestions(filtered);
    }
  }, [questions, searchTerm, selectedSubject]);

  const fetchQuestions = async () => {
    try {
      setLoadingBrowse(true);
      
      // Fetch questions with their subject and topic info
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          subject:subjects(subject_name),
          topic:topics(topic_name)
        `)
        .limit(100);
      
      if (error) throw error;
      
      // Format questions for display
      const formattedQuestions = data.map(q => ({
        id: q.id,
        question_text: q.question_text,
        subject_name: q.subject?.subject_name || 'Unknown',
        topic_name: q.topic?.topic_name || 'Unknown'
      }));
      
      setQuestions(formattedQuestions);
      setFilteredQuestions(formattedQuestions);
      
      // Extract unique subjects for the filter
      const uniqueSubjects = [...new Set(formattedQuestions.map(q => q.subject_name))];
      setSubjects(uniqueSubjects);
      
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions. Please try again later.');
    } finally {
      setLoadingBrowse(false);
    }
  };

  const handleQuestionIdChange = (e) => {
    setQuestionId(e.target.value);
    setError(null);
  };

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
  };

  const handleQuestionSelect = (question) => {
    setSelectedQuestion(question);
    setQuestionId(question.id.toString());
    setError(null);
  };

  const handleGenerateExplanation = async () => {
    if (!questionId) {
      setError("Please enter or select a question ID");
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
        
        <BackButton onClick={() => navigate('/admin')}>
          <FaArrowLeft /> Back to Admin
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
                This tool uses AI to generate detailed explanations for questions. 
                Either enter a question ID directly or browse to select a question.
              </Description>
              
              <SelectionModes>
                <SelectionModeButton 
                  active={selectionMode === 'id'} 
                  onClick={() => setSelectionMode('id')}
                >
                  Enter Question ID
                </SelectionModeButton>
                <SelectionModeButton 
                  active={selectionMode === 'browse'} 
                  onClick={() => setSelectionMode('browse')}
                >
                  Browse Questions
                </SelectionModeButton>
              </SelectionModes>
              
              {selectionMode === 'id' ? (
                <InputContainer>
                  <Label htmlFor="question-id">Question ID</Label>
                  <Input
                    id="question-id"
                    type="number"
                    value={questionId}
                    onChange={handleQuestionIdChange}
                    placeholder="Enter question ID"
                  />
                </InputContainer>
              ) : (
                <BrowseContainer>
                  <SearchContainer>
                    <SearchInput
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchTermChange}
                      placeholder="Search questions..."
                    />
                    <FaSearch style={{ color: '#9ca3af', position: 'absolute', right: '12px', top: '12px' }} />
                  </SearchContainer>
                  
                  <FilterContainer>
                    <Label>Filter by Subject:</Label>
                    <Select value={selectedSubject} onChange={handleSubjectChange}>
                      <option value="">All Subjects</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </Select>
                  </FilterContainer>
                  
                  <QuestionsListContainer>
                    {loadingBrowse ? (
                      <LoadingMessage>Loading questions...</LoadingMessage>
                    ) : filteredQuestions.length === 0 ? (
                      <EmptyState>No questions found matching your criteria</EmptyState>
                    ) : (
                      filteredQuestions.map(question => (
                        <QuestionItem 
                          key={question.id}
                          selected={selectedQuestion?.id === question.id}
                          onClick={() => handleQuestionSelect(question)}
                        >
                          <QuestionId>#{question.id}</QuestionId>
                          <QuestionDetails>
                            <QuestionText>{question.question_text}</QuestionText>
                            <QuestionMeta>
                              Subject: {question.subject_name} | Topic: {question.topic_name}
                            </QuestionMeta>
                          </QuestionDetails>
                        </QuestionItem>
                      ))
                    )}
                  </QuestionsListContainer>
                </BrowseContainer>
              )}
              
              {error && <ErrorContainer>{error}</ErrorContainer>}
              
              <GenerateButton onClick={handleGenerateExplanation} disabled={loading || !questionId}>
                {loading ? 'Generating...' : 'Generate Explanation'}
              </GenerateButton>
              
              {explanation && (
                <ResultContainer>
                  <h3>Explanation:</h3>
                  <ExplanationText>{explanation}</ExplanationText>
                </ResultContainer>
              )}
            </ExplanationCard>
            
            <InfoCard>
              <h3>How This Tool Works</h3>
              <p>
                This tool uses an advanced AI model to analyze questions and generate 
                clear, detailed explanations tailored for students.
              </p>
              
              <InfoBox>
                <h4>Benefits</h4>
                <ul>
                  <li>Saves time creating explanations manually</li>
                  <li>Consistent explanation quality</li>
                  <li>Detailed step-by-step breakdowns</li>
                  <li>Explanations stored in the database for future use</li>
                </ul>
              </InfoBox>
              
              <InfoBox warning>
                <h4>Important Notes</h4>
                <ul>
                  <li>Explanations are generated using AI and should be reviewed</li>
                  <li>Generation may take 10-15 seconds per question</li>
                  <li>Once generated, explanations are saved for reuse</li>
                </ul>
              </InfoBox>
            </InfoCard>
          </CardContainer>
        </ContentArea>
      </Content>
    </Container>
  );
};

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

const SelectionModes = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 20px;
`;

const SelectionModeButton = styled.button`
  background: none;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  color: ${props => props.active ? colors.brandPrimary : '#6b7280'};
  border-bottom: ${props => props.active ? `2px solid ${colors.brandPrimary}` : 'none'};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  margin-bottom: -1px;
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
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const BrowseContainer = styled.div`
  margin-bottom: 20px;
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  padding-right: 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const FilterContainer = styled.div`
  margin-bottom: 16px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const QuestionsListContainer = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
`;

const QuestionItem = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  background-color: ${props => props.selected ? '#eff6ff' : 'white'};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.selected ? '#eff6ff' : '#f9fafb'};
  }
`;

const QuestionId = styled.div`
  min-width: 60px;
  font-weight: 600;
  color: ${colors.brandPrimary};
`;

const QuestionDetails = styled.div`
  flex: 1;
`;

const QuestionText = styled.div`
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const QuestionMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const GenerateButton = styled.button`
  padding: 10px 16px;
  background-color: ${props => props.disabled ? '#9ca3af' : colors.brandPrimary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:hover {
    background-color: ${props => props.disabled ? '#9ca3af' : '#2563eb'};
  }
`;

const ErrorContainer = styled.div`
  background-color: #fee2e2;
  padding: 12px;
  border-radius: 4px;
  margin: 16px 0;
  color: #b91c1c;
`;

const ResultContainer = styled.div`
  margin-top: 24px;
  padding: 16px;
  background-color: #f3f4f6;
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

const LoadingMessage = styled.p`
  padding: 12px;
  text-align: center;
  color: #6b7280;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: #6b7280;
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

export default ExplainQuestion; 