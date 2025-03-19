import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaEye, FaPlus, FaRandom, FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const AdminTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuestionSelectionOpen, setIsQuestionSelectionOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [formData, setFormData] = useState({
    test_name: '',
    exam_id: '',
    type: 'recommended',
    number_of_questions: 10,
    test_duration: 30,
    selectedSubjectId: '',
    selectedTopicId: '',
    difficulty: 'all'
  });
  const [formErrors, setFormErrors] = useState({});
  const [step, setStep] = useState(1); // 1 = test details, 2 = question selection
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  useEffect(() => {
    fetchTests();
    fetchExams();
    fetchSubjects();
  }, []);

  // When exam_id changes, update topics if needed
  useEffect(() => {
    if (formData.exam_id && formData.selectedSubjectId) {
      fetchTopics(formData.selectedSubjectId);
    }
  }, [formData.exam_id, formData.selectedSubjectId]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tests')
        .select(`
          id,
          test_name,
          type,
          test_duration,
          number_of_questions,
          created_at,
          exam_id,
          exams (
            id,
            exam_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get additional information like attempt counts
      const testsWithStats = await Promise.all((data || []).map(async (test) => {
        // Count test attempts
        const { count: attemptCount, error: attemptError } = await supabase
          .from('test_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', test.id);
        
        if (attemptError) throw attemptError;
        
        // Count test questions
        const { count: questionCount, error: questionError } = await supabase
          .from('test_questions')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', test.id);
        
        if (questionError) throw questionError;
        
        return {
          ...test,
          attemptCount: attemptCount || 0,
          questionCount: questionCount || 0
        };
      }));

      setTests(testsWithStats);
    } catch (error) {
      console.error('Error fetching tests:', error);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, exam_name')
        .order('exam_name');
      
      if (error) throw error;
      
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
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

  const fetchTopics = async (subjectId) => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, topic_name')
        .eq('subject_id', subjectId)
        .order('topic_name');
      
      if (error) throw error;
      
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchAvailableQuestions = async () => {
    try {
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
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
        `);
      
      // Filter by topic if selected
      if (formData.selectedTopicId) {
        query = query.eq('topic_id', formData.selectedTopicId);
      } else if (formData.selectedSubjectId) {
        // Filter by subject if no topic is selected
        query = query.eq('topics.subject_id', formData.selectedSubjectId);
      }
      
      // Filter by difficulty if not 'all'
      if (formData.difficulty !== 'all') {
        query = query.eq('difficulty', formData.difficulty);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAvailableQuestions(data || []);
    } catch (error) {
      console.error('Error fetching available questions:', error);
      alert('Failed to load questions. Please try again.');
    }
  };

  const handleCreateTest = () => {
    setCurrentTest(null);
    setFormData({
      test_name: '',
      exam_id: exams.length > 0 ? exams[0].id : '',
      type: 'recommended',
      number_of_questions: 10,
      test_duration: 30,
      selectedSubjectId: '',
      selectedTopicId: '',
      difficulty: 'all'
    });
    setSelectedQuestions([]);
    setFormErrors({});
    setStep(1);
    setIsModalOpen(true);
  };

  const handleEditTest = async (test) => {
    setCurrentTest(test);
    setFormData({
      test_name: test.test_name,
      exam_id: test.exam_id,
      type: test.type,
      number_of_questions: test.number_of_questions,
      test_duration: test.test_duration,
      selectedSubjectId: '',
      selectedTopicId: '',
      difficulty: 'all'
    });
    
    // Fetch existing questions for this test
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select(`
          id,
          question_id,
          questions (
            id,
            question_text,
            difficulty,
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
          )
        `)
        .eq('test_id', test.id)
        .order('question_order', { ascending: true });
      
      if (error) throw error;
      
      // Transform data structure to match what we need
      const questions = (data || []).map(item => item.questions);
      setSelectedQuestions(questions);
    } catch (error) {
      console.error('Error fetching test questions:', error);
      setSelectedQuestions([]);
    }
    
    setFormErrors({});
    setStep(1);
    setIsModalOpen(true);
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? This will also delete all attempt data.')) {
      return;
    }
    
    try {
      // First delete test questions
      const { error: questionError } = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', testId);
      
      if (questionError) throw questionError;
      
      // Then delete the test
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId);
      
      if (error) throw error;
      
      // Refresh the list
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test. There might be attempts associated with it.');
    }
  };

  const handleViewTest = (testId) => {
    navigate(`/test-details/${testId}`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (['number_of_questions', 'test_duration'].includes(name)) {
      const numValue = parseInt(value, 10);
      setFormData({
        ...formData,
        [name]: isNaN(numValue) ? 0 : numValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear errors as user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
    
    // When subject changes, reset topic
    if (name === 'selectedSubjectId') {
      setFormData(prev => ({
        ...prev,
        selectedTopicId: ''
      }));
      if (value) {
        fetchTopics(value);
      } else {
        setTopics([]);
      }
    }
  };

  const handleSubmitBasicInfo = (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = {};
    if (!formData.test_name) {
      errors.test_name = 'Test name is required';
    }
    if (!formData.exam_id) {
      errors.exam_id = 'Please select an exam';
    }
    if (formData.number_of_questions <= 0) {
      errors.number_of_questions = 'Number of questions must be greater than 0';
    }
    if (formData.test_duration <= 0) {
      errors.test_duration = 'Test duration must be greater than 0';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Move to question selection
    setStep(2);
    fetchAvailableQuestions();
  };

  const handleGenerateRandomQuestions = async () => {
    try {
      setGeneratingQuestions(true);
      
      // Fetch questions with filters
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
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
        `);
      
      // Filter by topic if selected
      if (formData.selectedTopicId) {
        query = query.eq('topic_id', formData.selectedTopicId);
      } else if (formData.selectedSubjectId) {
        // Filter by subject if no topic is selected
        query = query.eq('topics.subject_id', formData.selectedSubjectId);
      }
      
      // Filter by difficulty if not 'all'
      if (formData.difficulty !== 'all') {
        query = query.eq('difficulty', formData.difficulty);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No questions available with the selected criteria');
        setGeneratingQuestions(false);
        return;
      }
      
      // Randomly select questions up to the desired count
      const shuffled = data.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(formData.number_of_questions, shuffled.length));
      
      setSelectedQuestions(selected);
      
      if (selected.length < formData.number_of_questions) {
        alert(`Only ${selected.length} questions available with the selected criteria. Consider adjusting your filters.`);
      }
    } catch (error) {
      console.error('Error generating random questions:', error);
      alert('Failed to generate random questions. Please try again.');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleAddQuestion = (question) => {
    if (selectedQuestions.some(q => q.id === question.id)) {
      // Already selected, so remove it
      setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
    } else {
      // Not selected, so add it if we're under the limit
      if (selectedQuestions.length < formData.number_of_questions) {
        setSelectedQuestions(prev => [...prev, question]);
      } else {
        alert(`You've already selected the maximum number of questions (${formData.number_of_questions})`);
      }
    }
  };

  const handleSubmitTest = async () => {
    // Validate that we have questions
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question for the test');
      return;
    }
    
    try {
      setLoading(true);
      
      let testId;
      
      if (currentTest) {
        // Update existing test
        const { data, error } = await supabase
          .from('tests')
          .update({
            test_name: formData.test_name,
            exam_id: formData.exam_id,
            type: formData.type,
            number_of_questions: selectedQuestions.length,
            test_duration: formData.test_duration,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTest.id)
          .select();
        
        if (error) throw error;
        testId = currentTest.id;
        
        // Delete existing test_questions
        const { error: deleteError } = await supabase
          .from('test_questions')
          .delete()
          .eq('test_id', testId);
        
        if (deleteError) throw deleteError;
      } else {
        // Create new test
        const { data, error } = await supabase
          .from('tests')
          .insert({
            test_name: formData.test_name,
            exam_id: formData.exam_id,
            type: formData.type,
            number_of_questions: selectedQuestions.length,
            test_duration: formData.test_duration,
            created_by_user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select();
        
        if (error) throw error;
        testId = data[0].id;
      }
      
      // Create test_questions entries
      const testQuestions = selectedQuestions.map((question, index) => ({
        test_id: testId,
        question_id: question.id,
        question_order: index + 1
      }));
      
      const { error: questionsError } = await supabase
        .from('test_questions')
        .insert(testQuestions);
      
      if (questionsError) throw questionsError;
      
      // Success - close modal and refresh tests
      setIsModalOpen(false);
      fetchTests();
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isQuestionSelected = (questionId) => {
    return selectedQuestions.some(q => q.id === questionId);
  };

  // Render test list
  if (loading && tests.length === 0) {
    return <Loading>Loading tests...</Loading>;
  }

  if (error) {
    return <Error>{error}</Error>;
  }

  return (
    <Container>
      <Header>
        <h2>Test Management</h2>
        <ActionButton primary onClick={handleCreateTest}>
          <FaPlus style={{ marginRight: '8px' }} /> Create New Test
        </ActionButton>
      </Header>
      
      {tests.length === 0 ? (
        <EmptyState>
          <p>No tests found. Click the button above to create your first test.</p>
        </EmptyState>
      ) : (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Exam</th>
                <th>Type</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Attempts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id}>
                  <td>{test.test_name}</td>
                  <td>{test.exams?.exam_name || 'N/A'}</td>
                  <td>
                    <TypeBadge type={test.type}>
                      {test.type === 'recommended' ? 'Recommended' : 'Custom'}
                    </TypeBadge>
                  </td>
                  <td>{test.questionCount}</td>
                  <td>{test.test_duration} min</td>
                  <td>{test.attemptCount}</td>
                  <td className="actions">
                    <ActionButton onClick={() => handleViewTest(test.id)}>
                      <FaEye />
                    </ActionButton>
                    <ActionButton onClick={() => handleEditTest(test)}>
                      <FaEdit />
                    </ActionButton>
                    <ActionButton 
                      danger
                      onClick={() => handleDeleteTest(test.id)}
                      disabled={test.attemptCount > 0}
                      title={test.attemptCount > 0 ? "Cannot delete tests with attempts" : "Delete test"}
                    >
                      <FaTrash />
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
      
      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>{currentTest ? 'Edit Test' : 'Create New Test'} - {step === 1 ? 'Basic Info' : 'Select Questions'}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              {step === 1 ? (
                <form onSubmit={handleSubmitBasicInfo}>
                  <FormGroup>
                    <Label htmlFor="test_name">Test Name</Label>
                    <Input
                      id="test_name"
                      name="test_name"
                      value={formData.test_name}
                      onChange={handleInputChange}
                      error={!!formErrors.test_name}
                    />
                    {formErrors.test_name && <ErrorText>{formErrors.test_name}</ErrorText>}
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="exam_id">Exam</Label>
                    <Select
                      id="exam_id"
                      name="exam_id"
                      value={formData.exam_id}
                      onChange={handleInputChange}
                      error={!!formErrors.exam_id}
                    >
                      <option value="">Select an exam</option>
                      {exams.map(exam => (
                        <option key={exam.id} value={exam.id}>
                          {exam.exam_name}
                        </option>
                      ))}
                    </Select>
                    {formErrors.exam_id && <ErrorText>{formErrors.exam_id}</ErrorText>}
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="test-type">Test Type</Label>
                    <Select
                      id="test-type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      error={formErrors.type}
                    >
                      <option value="recommended">Recommended</option>
                      <option value="custom">Custom</option>
                    </Select>
                    {formErrors.type && <ErrorText>{formErrors.type}</ErrorText>}
                  </FormGroup>
                  
                  <FormRow>
                    <FormGroup>
                      <Label htmlFor="number_of_questions">Number of Questions</Label>
                      <Input
                        id="number_of_questions"
                        name="number_of_questions"
                        type="number"
                        min="1"
                        value={formData.number_of_questions}
                        onChange={handleInputChange}
                        error={!!formErrors.number_of_questions}
                      />
                      {formErrors.number_of_questions && <ErrorText>{formErrors.number_of_questions}</ErrorText>}
                    </FormGroup>
                    
                    <FormGroup>
                      <Label htmlFor="test_duration">Duration (minutes)</Label>
                      <Input
                        id="test_duration"
                        name="test_duration"
                        type="number"
                        min="1"
                        value={formData.test_duration}
                        onChange={handleInputChange}
                        error={!!formErrors.test_duration}
                      />
                      {formErrors.test_duration && <ErrorText>{formErrors.test_duration}</ErrorText>}
                    </FormGroup>
                  </FormRow>
                  
                  <ButtonGroup>
                    <ActionButton type="button" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </ActionButton>
                    <ActionButton type="submit" primary>
                      Next
                    </ActionButton>
                  </ButtonGroup>
                </form>
              ) : (
                <div>
                  <FilterSection>
                    <h3>Filter Questions</h3>
                    <FormRow>
                      <FormGroup>
                        <Label htmlFor="selectedSubjectId">Subject</Label>
                        <Select
                          id="selectedSubjectId"
                          name="selectedSubjectId"
                          value={formData.selectedSubjectId}
                          onChange={handleInputChange}
                        >
                          <option value="">All Subjects</option>
                          {subjects.map(subject => (
                            <option key={subject.id} value={subject.id}>
                              {subject.subject_name}
                            </option>
                          ))}
                        </Select>
                      </FormGroup>
                      
                      <FormGroup>
                        <Label htmlFor="selectedTopicId">Topic</Label>
                        <Select
                          id="selectedTopicId"
                          name="selectedTopicId"
                          value={formData.selectedTopicId}
                          onChange={handleInputChange}
                          disabled={!formData.selectedSubjectId || topics.length === 0}
                        >
                          <option value="">All Topics</option>
                          {topics.map(topic => (
                            <option key={topic.id} value={topic.id}>
                              {topic.topic_name}
                            </option>
                          ))}
                        </Select>
                      </FormGroup>
                    </FormRow>
                    
                    <FormRow>
                      <FormGroup>
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <Select
                          id="difficulty"
                          name="difficulty"
                          value={formData.difficulty}
                          onChange={handleInputChange}
                        >
                          <option value="all">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </Select>
                      </FormGroup>
                      
                      <FormGroup style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <ActionButton
                          type="button"
                          onClick={fetchAvailableQuestions}
                          style={{ marginRight: '8px' }}
                        >
                          Apply Filters
                        </ActionButton>
                        
                        <ActionButton
                          type="button"
                          primary
                          onClick={handleGenerateRandomQuestions}
                          disabled={generatingQuestions}
                        >
                          <FaRandom style={{ marginRight: '8px' }} />
                          Auto-Generate
                        </ActionButton>
                      </FormGroup>
                    </FormRow>
                  </FilterSection>
                  
                  <QuestionSelectionContainer>
                    <SelectedStats>
                      <h3>Selected Questions: {selectedQuestions.length}/{formData.number_of_questions}</h3>
                    </SelectedStats>
                    
                    {availableQuestions.length === 0 ? (
                      <EmptyState>
                        <p>No questions found. Try changing your filters or create questions first.</p>
                      </EmptyState>
                    ) : (
                      <QuestionList>
                        {availableQuestions.map(question => (
                          <QuestionItem 
                            key={question.id} 
                            selected={isQuestionSelected(question.id)}
                            onClick={() => handleAddQuestion(question)}
                          >
                            <QuestionHeader>
                              <DifficultyBadge difficulty={question.difficulty}>
                                {question.difficulty}
                              </DifficultyBadge>
                              <TopicLabel>
                                {question.topics?.topic_name || 'Unknown Topic'}
                              </TopicLabel>
                              <SelectedCheckbox selected={isQuestionSelected(question.id)}>
                                {isQuestionSelected(question.id) && <FaCheck />}
                              </SelectedCheckbox>
                            </QuestionHeader>
                            <QuestionText>{question.question_text}</QuestionText>
                          </QuestionItem>
                        ))}
                      </QuestionList>
                    )}
                  </QuestionSelectionContainer>
                  
                  <ButtonGroup>
                    <ActionButton type="button" onClick={() => setStep(1)}>
                      Back
                    </ActionButton>
                    <ActionButton
                      type="button"
                      primary
                      onClick={handleSubmitTest}
                      disabled={selectedQuestions.length === 0}
                    >
                      {currentTest ? 'Update Test' : 'Create Test'}
                    </ActionButton>
                  </ButtonGroup>
                </div>
              )}
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
  
  h2 {
    ${typography.textXlBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const TestStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  
  h3 {
    ${typography.textMdMedium};
    color: ${colors.textSecondary};
    margin: 0 0 8px 0;
  }
  
  p {
    ${typography.textXlBold};
    color: ${colors.brandPrimary};
    margin: 0;
  }
`;

const TableContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid ${colors.borderPrimary};
  }
  
  th {
    ${typography.textSmBold};
    color: ${colors.textSecondary};
    background-color: ${colors.backgroundSecondary};
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  tr:hover {
    background-color: ${colors.backgroundSecondary}50;
  }
  
  .actions {
    display: flex;
    gap: 8px;
  }
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  ${typography.textSmMedium};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  background-color: ${props => {
    if (props.disabled) return '#e0e0e0';
    if (props.primary) return colors.brandPrimary;
    if (props.danger) return colors.accentError || '#f44336';
    return colors.backgroundSecondary;
  }};
  color: ${props => {
    if (props.disabled) return '#9e9e9e';
    if (props.primary || props.danger) return 'white';
    return colors.textPrimary;
  }};
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.disabled ? 0.7 : 1};
  
  &:hover {
    opacity: ${props => props.disabled ? 0.7 : 0.9};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  ${typography.textMdMedium};
  color: ${colors.textSecondary};
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
  width: 600px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid ${colors.borderPrimary};
  
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

// Add these new styled components for question selection
const FilterSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${colors.borderPrimary};
  
  h3 {
    ${typography.textMdBold};
    margin: 0 0 16px 0;
    color: ${colors.textPrimary};
  }
`;

const QuestionSelectionContainer = styled.div`
  margin-bottom: 24px;
  max-height: 400px;
  overflow-y: auto;
`;

const SelectedStats = styled.div`
  margin-bottom: 16px;
  
  h3 {
    ${typography.textMdBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const QuestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const QuestionItem = styled.div`
  padding: 16px;
  border-radius: 8px;
  background-color: ${props => props.selected ? `${colors.brandPrimary}15` : colors.backgroundSecondary};
  border: 1px solid ${props => props.selected ? colors.brandPrimary : 'transparent'};
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.selected ? `${colors.brandPrimary}25` : `${colors.backgroundSecondary}DD`};
  }
`;

const QuestionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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

const TopicLabel = styled.span`
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
`;

const SelectedCheckbox = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: ${props => props.selected ? colors.brandPrimary : 'white'};
  border: 1px solid ${props => props.selected ? colors.brandPrimary : colors.borderPrimary};
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const QuestionText = styled.p`
  ${typography.textMdRegular};
  margin: 0;
  color: ${colors.textPrimary};
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  ${typography.textXsRegular};
  background-color: ${props => {
    if (props.type === 'custom') return colors.brandPrimary;
    return '#4caf50'; // for recommended
  }};
  color: white;
`;

export default AdminTests; 