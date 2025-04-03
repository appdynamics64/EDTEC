import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaEye, FaPlus, FaRandom, FaCheck, FaSearch, FaTimes, FaFilter, FaChevronDown, FaClipboardList } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const AdminTests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTests();
      fetchExams();
      fetchSubjects();
    }
  }, [user]);

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
          exams (
            id,
            exam_name
          ),
          test_questions (
            id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Add question count to each test
      const testsWithCounts = data.map(test => ({
        ...test,
        questionCount: test.test_questions ? test.test_questions.length : 0
      }));
      
      setTests(testsWithCounts);
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
        .select('*')
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

  const handleDeleteTest = (test) => {
    setTestToDelete(test);
    setShowDeleteConfirmation(true);
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
            created_by_user_id: user.id
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

  // Filter tests based on search term and filters
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.test_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = filterExam ? test.exam_id === parseInt(filterExam) : true;
    const matchesType = filterType ? test.type === filterType : true;
    return matchesSearch && matchesExam && matchesType;
  });

  // Add the confirmDeleteTest function
  const confirmDeleteTest = async () => {
    try {
      // First check if there are any test attempts
      const { count, error: countError } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testToDelete.id);
      
      if (countError) throw countError;
      
      if (count > 0) {
        alert(`This test has ${count} attempts. Please delete the attempts first.`);
        setShowDeleteConfirmation(false);
        return;
      }
      
      // Delete test questions first
      const { error: questionsError } = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', testToDelete.id);
      
      if (questionsError) throw questionsError;
      
      // Then delete the test
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testToDelete.id);
      
      if (error) throw error;
      
      // Close the confirmation modal and refresh tests
      setShowDeleteConfirmation(false);
      setTestToDelete(null);
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test. Please try again.');
    }
  };

  return (
    <Container>
      <Header>
        <h1>Tests Management</h1>
        <ActionButton primary onClick={handleCreateTest}>
          <FaPlus /> Add New Test
        </ActionButton>
      </Header>
      
      <FiltersContainer>
        <SearchContainer>
          <label htmlFor="test-search">Search</label>
          <InputWrapper>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              id="test-search"
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <ClearButton onClick={() => setSearchTerm('')}>
                <FaTimes />
              </ClearButton>
            )}
          </InputWrapper>
        </SearchContainer>
        
        <FilterSelectContainer>
          <label htmlFor="exam-filter">Exam</label>
          <InputWrapper>
            <FilterSelect
              id="exam-filter"
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
            >
              <option value="">All Exams</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.exam_name}
                </option>
              ))}
            </FilterSelect>
            <SelectIcon>
              <FaChevronDown />
            </SelectIcon>
          </InputWrapper>
        </FilterSelectContainer>
        
        <FilterSelectContainer>
          <label htmlFor="type-filter">Type</label>
          <InputWrapper>
            <FilterSelect
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="custom">Custom</option>
              <option value="recommended">Recommended</option>
            </FilterSelect>
            <SelectIcon>
              <FaChevronDown />
            </SelectIcon>
          </InputWrapper>
        </FilterSelectContainer>
      </FiltersContainer>
      
      {loading ? (
        <Loading>Loading tests...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : (
        <ContentContainer>
          {filteredTests.length === 0 ? (
            <EmptyState>
              <p>No tests found. {searchTerm || filterExam || filterType ? 'Try clearing your filters or ' : ''}Add a new test to get started.</p>
              <ActionButton primary onClick={handleCreateTest}>
                <FaPlus /> Add New Test
              </ActionButton>
            </EmptyState>
          ) : (
            <TestsGrid>
              {filteredTests.map(test => (
                <TestCard key={test.id}>
                  <TestHeader>
                    <TestInfo>
                      <TestName>{test.test_name}</TestName>
                      <ExamName>
                        {test.exams?.exam_name || 'N/A'}
                        <TestType type={test.type}>
                          {test.type === 'recommended' ? 'Recommended' : 'Custom'}
                        </TestType>
                      </ExamName>
                    </TestInfo>
                  </TestHeader>
                  
                  <TestBody>
                    <TestStats>
                      <StatItem>
                        <StatLabel>Questions</StatLabel>
                        <StatValue>
                          <FaClipboardList />
                          {test.questionCount}
                        </StatValue>
                      </StatItem>
                      <StatItem>
                        <StatLabel>Duration</StatLabel>
                        <StatValue>
                          {test.test_duration} min
                        </StatValue>
                      </StatItem>
                    </TestStats>
                    
                    <TestActions>
                      <ActionIcon onClick={() => handleViewTest(test.id)} title="View Test">
                        <FaEye />
                      </ActionIcon>
                      <ActionIcon onClick={() => handleEditTest(test)} title="Edit Test">
                        <FaEdit />
                      </ActionIcon>
                      <ActionIcon 
                        danger
                        onClick={() => handleDeleteTest(test)}
                        disabled={test.attemptCount > 0}
                        title={test.attemptCount > 0 ? "Cannot delete tests with attempts" : "Delete test"}
                      >
                        <FaTrash />
                      </ActionIcon>
                    </TestActions>
                  </TestBody>
                </TestCard>
              ))}
            </TestsGrid>
          )}
        </ContentContainer>
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
      
      {showDeleteConfirmation && (
        <ConfirmationModal onClick={() => setShowDeleteConfirmation(false)}>
          <ConfirmationContent onClick={e => e.stopPropagation()}>
            <ConfirmationHeader>
              <h2>Delete Test</h2>
              <CloseButton onClick={() => setShowDeleteConfirmation(false)}>
                <FaTimes />
              </CloseButton>
            </ConfirmationHeader>
            <ConfirmationBody>
              <p>Are you sure you want to delete "{testToDelete?.test_name}"? This will also delete all associated test questions. This action cannot be undone.</p>
              <ButtonGroup>
                <Button onClick={() => setShowDeleteConfirmation(false)}>
                  Cancel
                </Button>
                <Button danger onClick={confirmDeleteTest}>
                  <FaTrash /> Delete
                </Button>
              </ButtonGroup>
            </ConfirmationBody>
          </ConfirmationContent>
        </ConfirmationModal>
      )}
    </Container>
  );
};

// Styled components
const Container = styled.div`
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f9fafb;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  h1 {
    ${typography.headingLg || 'font-size: 1.875rem; font-weight: 700;'};
    color: ${colors.textPrimary || '#1f2937'};
    margin: 0;
    background: linear-gradient(90deg, ${colors.brandPrimary || '#4f46e5'} 0%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  border: none;
  background-color: ${props => props.primary ? colors.brandPrimary || '#4f46e5' : 'white'};
  color: ${props => props.primary ? 'white' : colors.textPrimary || '#1f2937'};
  ${typography.textMdMedium || 'font-size: 1rem; font-weight: 500;'};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => props.primary ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.05)'};
  
  &:hover {
    background-color: ${props => props.primary ? colors.brandPrimaryDark || '#4338ca' : '#f9fafb'};
    transform: translateY(-2px);
    box-shadow: ${props => props.primary ? '0 6px 16px rgba(79, 70, 229, 0.3)' : '0 4px 8px rgba(0, 0, 0, 0.1)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const FiltersContainer = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  border: 1px solid rgba(0, 0, 0, 0.03);
`;

const FilterItem = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  label {
    display: block;
    ${typography.textSmBold || 'font-size: 0.75rem; font-weight: 600;'};
    color: ${colors.textSecondary || '#6b7280'};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchContainer = styled(FilterItem)``;
const FilterSelectContainer = styled(FilterItem)``;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.textSecondary || '#6b7280'};
  pointer-events: none;
  z-index: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 36px 0 36px;
  border-radius: 8px;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  background-color: ${colors.backgroundSecondary || '#f9fafb'};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    background-color: white;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${colors.textSecondary || '#6b7280'};
  cursor: pointer;
  z-index: 1;
  
  &:hover {
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  border-radius: 8px;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  background-color: ${colors.backgroundSecondary || '#f9fafb'};
  appearance: none;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    background-color: white;
  }
`;

const SelectIcon = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.textSecondary || '#6b7280'};
  pointer-events: none;
  z-index: 1;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Loading = styled.div`
  text-align: center;
  padding: 40px;
  ${typography.textLgMedium || 'font-size: 1.125rem; font-weight: 500;'};
  color: ${colors.textSecondary || '#6b7280'};
`;

const Error = styled.div`
  text-align: center;
  padding: 40px;
  ${typography.textLgMedium || 'font-size: 1.125rem; font-weight: 500;'};
  color: ${colors.accentError || '#dc2626'};
`;

const TestsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
`;

const TestCard = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
`;

const TestHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const TestInfo = styled.div`
  flex: 1;
`;

const TestName = styled.h3`
  ${typography.textLgBold || 'font-size: 1.125rem; font-weight: 700;'};
  color: ${colors.textPrimary || '#1f2937'};
  margin: 0 0 8px 0;
`;

const ExamName = styled.div`
  ${typography.textSmRegular || 'font-size: 0.875rem;'};
  color: ${colors.textSecondary || '#6b7280'};
`;

const TestType = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  ${typography.textXsRegular || 'font-size: 0.75rem;'};
  background-color: ${props => props.type === 'recommended' ? '#10b981' : colors.brandPrimary || '#4f46e5'};
  color: white;
  margin-left: 8px;
`;

const TestBody = styled.div`
  padding: 20px;
`;

const TestStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatLabel = styled.div`
  ${typography.textXsRegular || 'font-size: 0.75rem;'};
  color: ${colors.textSecondary || '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  ${typography.textMdBold || 'font-size: 1rem; font-weight: 700;'};
  color: ${colors.textPrimary || '#1f2937'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TestActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  border-top: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  padding-top: 20px;
`;

const ActionIcon = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.danger ? '#fee2e2' : '#f3f4f6'};
  color: ${props => props.danger ? '#dc2626' : colors.textSecondary || '#6b7280'};
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.danger ? '#fecaca' : '#e5e7eb'};
    color: ${props => props.danger ? '#b91c1c' : colors.textPrimary || '#1f2937'};
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 16px;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  
  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
  
  h2 {
    ${typography.textXlBold || 'font-size: 1.25rem; font-weight: 700;'};
    margin: 0;
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${colors.textSecondary || '#6b7280'};
  transition: all 0.2s;
  
  &:hover {
    background-color: ${colors.backgroundSecondary || '#f3f4f6'};
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  display: block;
  ${typography.textSmBold || 'font-size: 0.875rem; font-weight: 600;'};
  margin-bottom: 8px;
  color: ${colors.textPrimary || '#1f2937'};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.error ? colors.accentError || '#ef4444' : colors.borderPrimary || '#e5e7eb'};
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  
  &::placeholder {
    color: ${colors.textTertiary || '#9ca3af'};
  }
`;

const Select = styled.div`
  position: relative;
  
  select {
    appearance: none;
    width: 100%;
    padding: 12px 16px;
    padding-right: 40px;
    border-radius: 8px;
    border: 1px solid ${props => props.error ? colors.accentError || '#ef4444' : colors.borderPrimary || '#e5e7eb'};
    background-color: white;
    ${typography.textMdRegular || 'font-size: 1rem;'};
    color: ${colors.textPrimary || '#1f2937'};
    cursor: pointer;
    transition: all 0.2s;
    
    &:focus {
      outline: none;
      border-color: ${colors.brandPrimary || '#4f46e5'};
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${colors.textSecondary || '#6b7280'};
    pointer-events: none;
  }
`;

const ErrorText = styled.div`
  ${typography.textSmRegular || 'font-size: 0.875rem;'};
  color: ${colors.accentError || '#ef4444'};
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background-color: ${props => props.primary ? colors.brandPrimary || '#4f46e5' : props.danger ? colors.accentError || '#ef4444' : colors.backgroundSecondary || '#f3f4f6'};
  color: ${props => (props.primary || props.danger) ? 'white' : colors.textPrimary || '#1f2937'};
  ${typography.textMdMedium || 'font-size: 1rem; font-weight: 500;'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: ${props => (props.primary || props.danger) ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'};
  
  &:hover {
    background-color: ${props => props.primary ? colors.brandPrimaryDark || '#4338ca' : props.danger ? colors.accentErrorDark || '#dc2626' : '#e5e7eb'};
    transform: translateY(-2px);
    box-shadow: ${props => (props.primary || props.danger) ? '0 6px 16px rgba(79, 70, 229, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.05)'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ConfirmationModal = styled(Modal)``;

const ConfirmationContent = styled.div`
  background-color: white;
  border-radius: 16px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ConfirmationHeader = styled(ModalHeader)``;

const ConfirmationBody = styled(ModalBody)`
  text-align: center;
  
  p {
    ${typography.textMdRegular || 'font-size: 1rem;'};
    color: ${colors.textSecondary || '#6b7280'};
    margin-bottom: 24px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  p {
    ${typography.textMdRegular || 'font-size: 1rem;'};
    color: ${colors.textSecondary || '#6b7280'};
    margin-bottom: 24px;
  }
`;

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

export default AdminTests; 