import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';

const AdminQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  
  // Form state for question creation/editing
  const [formData, setFormData] = useState({
    question_text: '',
    difficulty: 'medium',
    subject_id: '',
    topic_id: '',
    explanation: '',
    options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (filterSubject) {
      const filtered = topics.filter(topic => topic.subject_id === parseInt(filterSubject));
      setFilteredTopics(filtered);
    } else {
      setFilteredTopics([]);
      setFilterTopic('');
    }
  }, [filterSubject, topics]);

  useEffect(() => {
    if (formData.subject_id) {
      fetchTopicsForSubject(formData.subject_id);
    } else {
      setFilteredTopics([]);
    }
  }, [formData.subject_id]);

  const fetchQuestions = async (filters = {}) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
          explanation,
          created_at,
          topic_id,
          topics (
            id,
            topic_name,
            subject_id,
            subjects (
              id,
              subject_name
            )
          ),
          question_options (
            id,
            option_text,
            is_correct
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters if provided
      if (filters.topic_id) {
        query = query.eq('topic_id', filters.topic_id);
      } else if (filters.subject_id) {
        query = query.eq('topics.subject_id', filters.subject_id);
      }
      
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, subject_name')
        .order('subject_name');
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, topic_name, subject_id')
        .order('topic_name');
      
      if (error) throw error;
      
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchTopicsForSubject = async (subjectId) => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, topic_name, subject_id')
        .eq('subject_id', subjectId)
        .order('topic_name');
      
      if (error) throw error;
      
      setFilteredTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics for subject:', error);
    }
  };

  const handleCreateQuestion = () => {
    setCurrentQuestion(null);
    setFormData({
      question_text: '',
      difficulty: 'medium',
      subject_id: '',
      topic_id: '',
      explanation: '',
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditQuestion = (question) => {
    // Format the options from the question for the form
    const options = question.question_options.map(option => ({
      id: option.id,
      option_text: option.option_text,
      is_correct: option.is_correct
    }));
    
    // Ensure we have at least 4 options by adding empty ones if needed
    while (options.length < 4) {
      options.push({ option_text: '', is_correct: false });
    }
    
    setCurrentQuestion(question);
    setFormData({
      question_text: question.question_text,
      difficulty: question.difficulty,
      subject_id: question.topics.subjects.id.toString(),
      topic_id: question.topic_id.toString(),
      explanation: question.explanation || '',
      options
    });
    setFormErrors({});
    setIsModalOpen(true);
    
    // Make sure topics for this subject are loaded
    fetchTopicsForSubject(question.topics.subjects.id);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    try {
      // Delete options first
      const { error: optionsError } = await supabase
        .from('question_options')
        .delete()
        .eq('question_id', questionId);
      
      if (optionsError) throw optionsError;
      
      // Then delete the question
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Refresh the list
      fetchQuestions({
        subject_id: filterSubject || undefined,
        topic_id: filterTopic || undefined,
        difficulty: filterDifficulty || undefined
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: undefined
      });
    }
  };

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...formData.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      options: updatedOptions
    });
    
    // Clear option errors if any
    if (formErrors.options) {
      setFormErrors({
        ...formErrors,
        options: undefined
      });
    }
  };

  const handleCorrectOptionChange = (index) => {
    const updatedOptions = formData.options.map((option, i) => ({
      ...option,
      is_correct: i === index
    }));
    
    setFormData({
      ...formData,
      options: updatedOptions
    });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.question_text.trim()) {
      errors.question_text = 'Question text is required';
    }
    
    if (!formData.subject_id) {
      errors.subject_id = 'Subject is required';
    }
    
    if (!formData.topic_id) {
      errors.topic_id = 'Topic is required';
    }
    
    // Check if at least 2 options are provided and one is marked correct
    const validOptions = formData.options.filter(option => option.option_text.trim());
    if (validOptions.length < 2) {
      errors.options = 'At least 2 options are required';
    }
    
    const hasCorrectOption = formData.options.some(option => 
      option.is_correct && option.option_text.trim()
    );
    
    if (!hasCorrectOption) {
      errors.options = errors.options || 'One option must be marked as correct';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (currentQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update({
            question_text: formData.question_text,
            difficulty: formData.difficulty,
            topic_id: formData.topic_id,
            explanation: formData.explanation,
            updated_at: new Date()
          })
          .eq('id', currentQuestion.id);
        
        if (error) throw error;
        
        // Handle options: update existing, create new ones
        for (const option of formData.options) {
          if (option.option_text.trim()) {
            if (option.id) {
              // Update existing option
              const { error: optionError } = await supabase
                .from('question_options')
                .update({
                  option_text: option.option_text,
                  is_correct: option.is_correct,
                  updated_at: new Date()
                })
                .eq('id', option.id);
              
              if (optionError) throw optionError;
            } else {
              // Create new option
              const { error: optionError } = await supabase
                .from('question_options')
                .insert({
                  question_id: currentQuestion.id,
                  option_text: option.option_text,
                  is_correct: option.is_correct
                });
              
              if (optionError) throw optionError;
            }
          } else if (option.id) {
            // Delete empty existing option
            const { error: optionError } = await supabase
              .from('question_options')
              .delete()
              .eq('id', option.id);
            
            if (optionError) throw optionError;
          }
        }
      } else {
        // Create new question
        const { data, error } = await supabase
          .from('questions')
          .insert({
            question_text: formData.question_text,
            difficulty: formData.difficulty,
            topic_id: formData.topic_id,
            explanation: formData.explanation
          })
          .select();
        
        if (error) throw error;
        
        const newQuestionId = data[0].id;
        
        // Create options for the new question
        const optionsToInsert = formData.options
          .filter(option => option.option_text.trim())
          .map(option => ({
            question_id: newQuestionId,
            option_text: option.option_text,
            is_correct: option.is_correct
          }));
        
        if (optionsToInsert.length > 0) {
          const { error: optionsError } = await supabase
            .from('question_options')
            .insert(optionsToInsert);
          
          if (optionsError) throw optionsError;
        }
      }
      
      // Close modal and refresh questions
      setIsModalOpen(false);
      fetchQuestions({
        subject_id: filterSubject || undefined,
        topic_id: filterTopic || undefined,
        difficulty: filterDifficulty || undefined
      });
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question. Please try again.');
    }
  };

  const handleFilter = () => {
    fetchQuestions({
      subject_id: filterSubject || undefined,
      topic_id: filterTopic || undefined,
      difficulty: filterDifficulty || undefined
    });
  };

  const handleClearFilters = () => {
    setFilterSubject('');
    setFilterTopic('');
    setFilterDifficulty('');
    fetchQuestions();
  };

  useEffect(() => {
    // Load all topics when component mounts
    fetchTopics();
  }, []);

  if (loading && questions.length === 0) {
    return <Loading>Loading questions...</Loading>;
  }

  return (
    <Container>
      <Header>
        <h1>Questions Management</h1>
        <ActionButton primary onClick={handleCreateQuestion}>
          <FaPlus /> Add New Question
        </ActionButton>
      </Header>
      
      <FilterPanel>
        <h3>Filter Questions</h3>
        <FilterGrid>
          <FormGroup>
            <Label htmlFor="filter-subject">Subject</Label>
            <Select
              id="filter-subject"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
              ))}
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="filter-topic">Topic</Label>
            <Select
              id="filter-topic"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              disabled={!filterSubject}
            >
              <option value="">All Topics</option>
              {filteredTopics.map(topic => (
                <option key={topic.id} value={topic.id}>{topic.topic_name}</option>
              ))}
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="filter-difficulty">Difficulty</Label>
            <Select
              id="filter-difficulty"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </FormGroup>
          
          <FilterButtons>
            <ActionButton type="button" onClick={handleFilter}>Apply Filters</ActionButton>
            <ActionButton type="button" onClick={handleClearFilters}>Clear Filters</ActionButton>
          </FilterButtons>
        </FilterGrid>
      </FilterPanel>

      {error ? (
        <Error>{error}</Error>
      ) : questions.length === 0 ? (
        <EmptyState>
          <p>No questions found. Create your first question to get started.</p>
          <ActionButton primary onClick={handleCreateQuestion}>
            <FaPlus /> Add New Question
          </ActionButton>
        </EmptyState>
      ) : (
        <QuestionsList>
          {questions.map(question => (
            <QuestionCard key={question.id}>
              <QuestionHeader>
                <DifficultyBadge difficulty={question.difficulty}>
                  {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                </DifficultyBadge>
                <SubjectInfo>
                  {question.topics?.subjects?.subject_name} &gt; {question.topics?.topic_name}
                </SubjectInfo>
                <ActionButtons>
                  <IconButton onClick={() => handleEditQuestion(question)}>
                    <FaEdit />
                  </IconButton>
                  <IconButton danger onClick={() => handleDeleteQuestion(question.id)}>
                    <FaTrash />
                  </IconButton>
                </ActionButtons>
              </QuestionHeader>
              
              <QuestionText>{question.question_text}</QuestionText>
              
              <OptionsList>
                {question.question_options.map(option => (
                  <OptionItem key={option.id} correct={option.is_correct}>
                    {option.is_correct ? <FaCheck /> : <FaTimes />}
                    <span>{option.option_text}</span>
                  </OptionItem>
                ))}
              </OptionsList>
              
              {question.explanation && (
                <Explanation>
                  <h4>Explanation:</h4>
                  <p>{question.explanation}</p>
                </Explanation>
              )}
            </QuestionCard>
          ))}
        </QuestionsList>
      )}

      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>{currentQuestion ? 'Edit Question' : 'Create New Question'}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="question_text">Question Text</Label>
                  <TextArea
                    id="question_text"
                    name="question_text"
                    value={formData.question_text}
                    onChange={handleInputChange}
                    error={formErrors.question_text}
                    rows={4}
                  />
                  {formErrors.question_text && <ErrorText>{formErrors.question_text}</ErrorText>}
                </FormGroup>
                
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="subject_id">Subject</Label>
                    <Select
                      id="subject_id"
                      name="subject_id"
                      value={formData.subject_id}
                      onChange={handleInputChange}
                      error={formErrors.subject_id}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subject_name}
                        </option>
                      ))}
                    </Select>
                    {formErrors.subject_id && <ErrorText>{formErrors.subject_id}</ErrorText>}
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="topic_id">Topic</Label>
                    <Select
                      id="topic_id"
                      name="topic_id"
                      value={formData.topic_id}
                      onChange={handleInputChange}
                      disabled={!formData.subject_id}
                      error={formErrors.topic_id}
                    >
                      <option value="">Select Topic</option>
                      {filteredTopics.map(topic => (
                        <option key={topic.id} value={topic.id}>
                          {topic.topic_name}
                        </option>
                      ))}
                    </Select>
                    {formErrors.topic_id && <ErrorText>{formErrors.topic_id}</ErrorText>}
                  </FormGroup>
                </FormRow>
                
                <FormGroup>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </FormGroup>
                
                <OptionsSection>
                  <OptionsHeader>
                    <h3>Answer Options</h3>
                    {formErrors.options && <ErrorText>{formErrors.options}</ErrorText>}
                  </OptionsHeader>
                  
                  {formData.options.map((option, index) => (
                    <OptionFormItem key={index}>
                      <OptionInput
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option.option_text}
                        onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                      />
                      <CorrectToggle 
                        type="button"
                        isCorrect={option.is_correct}
                        onClick={() => handleCorrectOptionChange(index)}
                      >
                        {option.is_correct ? 'Correct' : 'Mark as correct'}
                      </CorrectToggle>
                    </OptionFormItem>
                  ))}
                </OptionsSection>
                
                <FormGroup>
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <TextArea
                    id="explanation"
                    name="explanation"
                    value={formData.explanation}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Explain why the correct answer is correct..."
                  />
                </FormGroup>
                
                <ButtonGroup>
                  <ActionButton type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton type="submit" primary>
                    {currentQuestion ? 'Update Question' : 'Create Question'}
                  </ActionButton>
                </ButtonGroup>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h1 {
    ${typography.textXlBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const FilterPanel = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  
  h3 {
    ${typography.textLgBold};
    margin: 0 0 16px 0;
    color: ${colors.textPrimary};
  }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  align-items: end;
`;

const FilterButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const QuestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const QuestionCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
`;

const QuestionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
`;

const DifficultyBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  ${typography.textXsRegular};
  background-color: ${props => {
    if (props.difficulty === 'easy') return '#4caf50';
    if (props.difficulty === 'medium') return '#ff9800';
    if (props.difficulty === 'hard') return '#f44336';
    return colors.backgroundSecondary;
  }};
  color: white;
`;

const SubjectInfo = styled.span`
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
  margin-left: 12px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.danger ? '#f4433620' : colors.backgroundSecondary};
  color: ${props => props.danger ? '#f44336' : colors.textPrimary};
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.danger ? '#f4433640' : `${colors.backgroundSecondary}DD`};
  }
`;

const QuestionText = styled.p`
  ${typography.textMdMedium};
  margin: 0 0 16px 0;
  color: ${colors.textPrimary};
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const OptionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: ${props => props.correct ? '#4caf5015' : colors.backgroundSecondary};
  border: 1px solid ${props => props.correct ? '#4caf50' : 'transparent'};
  
  svg {
    color: ${props => props.correct ? '#4caf50' : '#f44336'};
  }
  
  span {
    ${typography.textSm};
    color: ${colors.textPrimary};
  }
`;

const Explanation = styled.div`
  background-color: ${colors.backgroundSecondary}50;
  padding: 12px;
  border-radius: 4px;
  border-left: 3px solid ${colors.brandPrimary};
  
  h4 {
    ${typography.textSmBold};
    margin: 0 0 4px 0;
    color: ${colors.textPrimary};
  }
  
  p {
    ${typography.textSm};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  
  p {
    ${typography.textMdMedium};
    color: ${colors.textSecondary};
    margin-bottom: 16px;
  }
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  ${typography.textSmMedium};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: ${props => props.primary ? colors.brandPrimary : colors.backgroundSecondary};
  color: ${props => props.primary ? 'white' : colors.textPrimary};
  border: none;
  
  &:hover {
    opacity: 0.9;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 700px;
  max-width: 90%;
  max-height: 90vh;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid ${colors.borderPrimary};
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
  
  h2 {
    ${typography.textLgBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${colors.textSecondary};
  
  &:hover {
    color: ${colors.textPrimary};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const Label = styled.label`
  display: block;
  ${typography.textSmBold};
  margin-bottom: 8px;
  color: ${colors.textSecondary};
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.error ? colors.accentError : colors.borderPrimary};
  ${typography.textMd};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.error ? colors.accentError : colors.borderPrimary};
  ${typography.textMd};
  resize: vertical;
  min-height: ${props => props.rows * 24}px;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.error ? colors.accentError : colors.borderPrimary};
  ${typography.textMd};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const ErrorText = styled.p`
  ${typography.textSmMedium};
  color: ${colors.accentError};
  margin: 4px 0 0 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const OptionsSection = styled.div`
  margin-bottom: 24px;
  border: 1px solid ${colors.borderPrimary};
  border-radius: 6px;
  padding: 16px;
`;

const OptionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  h3 {
    ${typography.textMdBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const OptionFormItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
`;

const OptionInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${colors.borderPrimary};
  ${typography.textMd};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const CorrectToggle = styled.button`
  padding: 8px 12px;
  border-radius: 6px;
  background-color: ${props => props.isCorrect ? '#4caf50' : colors.backgroundSecondary};
  color: ${props => props.isCorrect ? 'white' : colors.textPrimary};
  border: none;
  cursor: pointer;
  ${typography.textSmMedium};
  white-space: nowrap;
  
  &:hover {
    opacity: 0.9;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 40px;
  ${typography.textLgMedium};
  color: ${colors.textSecondary};
`;

const Error = styled.div`
  text-align: center;
  padding: 40px;
  ${typography.textLgMedium};
  color: ${colors.accentError || 'red'};
`;

export default AdminQuestions; 