import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaUpload, FaFileUpload, FaFileCode, FaSpinner, FaArrowLeft, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';
import Papa from 'papaparse';

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

  // New state variables for import functionality
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState('json'); // 'json' or 'csv'
  const [jsonInput, setJsonInput] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState([]);
  const [importPreview, setImportPreview] = useState(false);
  
  const fileInputRef = useRef(null);

  // Add a new state variable to track the current modal view
  const [modalView, setModalView] = useState('form'); // 'form', 'import-json', 'import-csv', 'import-preview'

  // Add new state for solution viewing
  const [expandedSolution, setExpandedSolution] = useState(null);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [currentSolution, setCurrentSolution] = useState(null);

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
      setError(null);
      
      // First, build the query with proper relationships
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
          explanation,
          topic_id,
          topics!inner (
            id,
            topic_name,
            subject_id,
            subjects!inner (
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
      
      // Apply filters
      if (filters.subject_id) {
        // Use the foreign key path for subject filtering
        query = query.eq('topics.subjects.id', filters.subject_id);
      }
      
      if (filters.topic_id) {
        query = query.eq('topic_id', filters.topic_id);
      }
      
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      // Ensure we have valid data
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again.');
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
    setModalView('form');
    setIsModalOpen(true);
  };

  const handleEditQuestion = (question) => {
    // Close the solution modal if it's open
    if (showSolutionModal) {
      setShowSolutionModal(false);
    }
    
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
    setModalView('form');
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
      setModalView('form');
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

  const handleFilterChange = (type, value) => {
    switch (type) {
      case 'subject':
        setFilterSubject(value);
        // When subject changes, reset topic filter
        setFilterTopic('');
        // Apply filters immediately
        fetchQuestions({
          subject_id: value || undefined,
          topic_id: undefined, // Reset topic filter
          difficulty: filterDifficulty || undefined
        });
        break;
      case 'topic':
        setFilterTopic(value);
        // Apply filters immediately
        fetchQuestions({
          subject_id: filterSubject || undefined,
          topic_id: value || undefined,
          difficulty: filterDifficulty || undefined
        });
        break;
      case 'difficulty':
        setFilterDifficulty(value);
        // Apply filters immediately
        fetchQuestions({
          subject_id: filterSubject || undefined,
          topic_id: filterTopic || undefined,
          difficulty: value || undefined
        });
        break;
      default:
        break;
    }
  };

  const handleClearFilters = () => {
    setFilterSubject('');
    setFilterTopic('');
    setFilterDifficulty('');
    // Fetch all questions immediately
    fetchQuestions();
  };

  useEffect(() => {
    // Load all topics when component mounts
    fetchTopics();
  }, []);

  // New function to handle JSON validation
  const validateJsonQuestions = (jsonData) => {
    const errors = [];
    
    if (!Array.isArray(jsonData)) {
      errors.push('JSON data must be an array of questions');
      return { valid: false, errors };
    }
    
    jsonData.forEach((question, index) => {
      if (!question.question_text) {
        errors.push(`Question ${index + 1}: Missing question text`);
      }
      
      if (!question.topic_id && !question.topic_name) {
        errors.push(`Question ${index + 1}: Missing topic ID or name`);
      }
      
      if (!question.difficulty) {
        errors.push(`Question ${index + 1}: Missing difficulty`);
      }
      
      if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      } else {
        const correctOptions = question.options.filter(opt => opt.is_correct);
        if (correctOptions.length === 0) {
          errors.push(`Question ${index + 1}: Must have at least 1 correct option`);
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  };
  
  // Function to handle JSON input
  const handleJsonImport = async () => {
    setImportErrors([]);
    setImportLoading(true);
    
    try {
      const jsonData = JSON.parse(jsonInput);
      const validation = validateJsonQuestions(jsonData);
      
      if (!validation.valid) {
        setImportErrors(validation.errors);
        setImportLoading(false);
        return;
      }
      
      setImportedQuestions(jsonData);
      setModalView('import-preview');
    } catch (error) {
      setImportErrors(['Invalid JSON format: ' + error.message]);
    } finally {
      setImportLoading(false);
    }
  };
  
  // Function to handle CSV file upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCsvFile(file);
      
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            // Transform CSV data to match our question format
            const transformedQuestions = results.data
              .filter(row => row.question_text) // Skip empty rows
              .map((row, index) => {
                // Extract options from the CSV
                // Assuming CSV has columns: option1, option1_correct, option2, option2_correct, etc.
                const options = [];
                let optionIndex = 1;
                
                while (row[`option${optionIndex}`]) {
                  options.push({
                    option_text: row[`option${optionIndex}`],
                    is_correct: row[`option${optionIndex}_correct`] === 'true'
                  });
                  optionIndex++;
                }
                
                return {
                  question_text: row.question_text,
                  difficulty: row.difficulty || 'medium',
                  topic_id: row.topic_id,
                  topic_name: row.topic_name,
                  explanation: row.explanation || '',
                  options: options
                };
              });
            
            const validation = validateJsonQuestions(transformedQuestions);
            
            if (!validation.valid) {
              setImportErrors(validation.errors);
              return;
            }
            
            setImportedQuestions(transformedQuestions);
            setModalView('import-preview');
          } catch (error) {
            setImportErrors(['Error processing CSV: ' + error.message]);
          }
        },
        error: (error) => {
          setImportErrors(['Error parsing CSV: ' + error.message]);
        }
      });
    }
  };
  
  // Function to save imported questions
  const saveImportedQuestions = async () => {
    setImportLoading(true);
    setImportErrors([]);
    
    try {
      // Process each question
      for (const question of importedQuestions) {
        // If topic_name is provided but not topic_id, try to find or create the topic
        if (question.topic_name && !question.topic_id) {
          // First check if the topic exists
          const { data: existingTopics, error: topicError } = await supabase
            .from('topics')
            .select('id')
            .eq('topic_name', question.topic_name)
            .eq('subject_id', formData.subject_id);
          
          if (topicError) throw topicError;
          
          if (existingTopics && existingTopics.length > 0) {
            question.topic_id = existingTopics[0].id;
          } else {
            // Create new topic
            const { data: newTopic, error: createTopicError } = await supabase
              .from('topics')
              .insert([{
                topic_name: question.topic_name,
                subject_id: formData.subject_id
              }])
              .select();
            
            if (createTopicError) throw createTopicError;
            
            question.topic_id = newTopic[0].id;
          }
        }
        
        // Insert the question
        const { data: insertedQuestion, error: questionError } = await supabase
          .from('questions')
          .insert([{
            question_text: question.question_text,
            difficulty: question.difficulty,
            topic_id: question.topic_id,
            explanation: question.explanation || ''
          }])
          .select();
        
        if (questionError) throw questionError;
        
        // Insert options
        const optionsToInsert = question.options.map(option => ({
          question_id: insertedQuestion[0].id,
          option_text: option.option_text,
          is_correct: option.is_correct
        }));
        
        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(optionsToInsert);
        
        if (optionsError) throw optionsError;
      }
      
      // Refresh questions list
      fetchQuestions();
      
      // Show success message and close modal
      alert(`Successfully imported ${importedQuestions.length} questions!`);
      handleCloseModal();
    } catch (error) {
      setImportErrors(['Error saving questions: ' + error.message]);
    } finally {
      setImportLoading(false);
    }
  };
  
  // Function to download CSV template
  const downloadCsvTemplate = () => {
    const headers = [
      'question_text',
      'difficulty',
      'topic_id',
      'topic_name',
      'explanation',
      'option1',
      'option1_correct',
      'option2',
      'option2_correct',
      'option3',
      'option3_correct',
      'option4',
      'option4_correct'
    ];
    
    const sampleData = [
      'What is the capital of France?',
      'easy',
      '',
      'Geography',
      'Paris is the capital of France',
      'Paris',
      'true',
      'London',
      'false',
      'Berlin',
      'false',
      'Madrid',
      'false'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Function to download JSON template
  const downloadJsonTemplate = () => {
    const template = [
      {
        "question_text": "What is the capital of France?",
        "difficulty": "easy",
        "topic_id": "",
        "topic_name": "Geography",
        "explanation": "Paris is the capital of France",
        "options": [
          {
            "option_text": "Paris",
            "is_correct": true
          },
          {
            "option_text": "London",
            "is_correct": false
          },
          {
            "option_text": "Berlin",
            "is_correct": false
          },
          {
            "option_text": "Madrid",
            "is_correct": false
          }
        ]
      }
    ];
    
    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question_template.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modify the modal close handler to reset the view
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalView('form');
    setImportErrors([]);
    setImportedQuestions([]);
    setJsonInput('');
    setCsvFile(null);
  };

  // Update the modal content based on the current view
  const renderModalContent = () => {
    switch (modalView) {
      case 'form':
        return (
          <ModalBody>
            {/* New Import Banner at the top */}
            <ImportBanner>
              <ImportBannerContent>
                <ImportBannerText>
                  <h3>Add Questions</h3>
                  <p>Create a single question or import multiple questions at once</p>
                </ImportBannerText>
                <ImportBannerOptions>
                  <ImportBannerOption onClick={() => setModalView('import-json')}>
                    <FaFileCode />
                    <span>Import JSON</span>
                  </ImportBannerOption>
                  <ImportBannerOption onClick={() => setModalView('import-csv')}>
                    <FaFileUpload />
                    <span>Import CSV</span>
                  </ImportBannerOption>
                </ImportBannerOptions>
              </ImportBannerContent>
            </ImportBanner>

            <FormDivider>
              <FormDividerText>Or create a single question</FormDividerText>
            </FormDivider>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="question_text">Question Text</Label>
                <TextArea
                  id="question_text"
                  name="question_text"
                  value={formData.question_text}
                  onChange={handleInputChange}
                  placeholder="Enter the question text here..."
                  rows={3}
                  required
                />
                {formErrors.question_text && <ErrorText>{formErrors.question_text}</ErrorText>}
              </FormGroup>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="subject_id">Subject</Label>
                  <Select>
                    <select
                      id="subject_id"
                      name="subject_id"
                      value={formData.subject_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </Select>
                  {formErrors.subject_id && <ErrorText>{formErrors.subject_id}</ErrorText>}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="topic_id">Topic</Label>
                  <Select>
                    <select
                      id="topic_id"
                      name="topic_id"
                      value={formData.topic_id}
                      onChange={handleInputChange}
                      disabled={!formData.subject_id}
                      required
                    >
                      <option value="">Select Topic</option>
                      {filteredTopics.map(topic => (
                        <option key={topic.id} value={topic.id}>
                          {topic.topic_name}
                        </option>
                      ))}
                    </select>
                  </Select>
                  {formErrors.topic_id && <ErrorText>{formErrors.topic_id}</ErrorText>}
                </FormGroup>
              </FormRow>
              
              <FormGroup>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select>
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Select>
                {formErrors.difficulty && <ErrorText>{formErrors.difficulty}</ErrorText>}
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <TextArea
                  id="explanation"
                  name="explanation"
                  value={formData.explanation}
                  onChange={handleInputChange}
                  placeholder="Provide an explanation for the correct answer..."
                  rows={3}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Options</Label>
                {formData.options.map((option, index) => (
                  <OptionItem key={index}>
                    <OptionInput>
                      <Input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option.option_text}
                        onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                        required={index < 2}
                      />
                    </OptionInput>
                    
                    <CheckboxContainer>
                      <CheckboxInput
                        type="checkbox"
                        id={`option-correct-${index}`}
                        checked={option.is_correct}
                        onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                      />
                      <CheckboxLabel htmlFor={`option-correct-${index}`}>
                        Correct
                      </CheckboxLabel>
                    </CheckboxContainer>
                  </OptionItem>
                ))}
                {formErrors.options && <ErrorText>{formErrors.options}</ErrorText>}
              </FormGroup>
              
              <ButtonGroup>
                <ActionButton type="button" onClick={handleCloseModal}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" primary>
                  {currentQuestion ? 'Update Question' : 'Create Question'}
                </ActionButton>
              </ButtonGroup>
            </form>
          </ModalBody>
        );
        
      case 'import-json':
        return (
          <ModalBody>
            <ImportHeader>
              <ModalBackButton onClick={() => setModalView('form')}>
                <FaArrowLeft /> Back
              </ModalBackButton>
              <h2>Import Questions from JSON</h2>
            </ImportHeader>
            
            <ImportInstructions>
              <InstructionStep>
                <StepNumber>1</StepNumber>
                <StepText>
                  <h4>Prepare your JSON data</h4>
                  <p>Each question should include question_text, difficulty, topic_id (or topic_name), and an array of options.</p>
                  <ActionButton secondary onClick={downloadJsonTemplate} small>
                    <FaFileCode /> Download Template
                  </ActionButton>
                </StepText>
              </InstructionStep>
              
              <InstructionStep>
                <StepNumber>2</StepNumber>
                <StepText>
                  <h4>Paste your JSON below</h4>
                </StepText>
              </InstructionStep>
            </ImportInstructions>
            
            <JsonTextAreaContainer>
              <TextArea
                className="json-textarea"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='[{"question_text": "What is...?", "difficulty": "medium", "topic_name": "Topic", "options": [{"option_text": "Option 1", "is_correct": true}, {"option_text": "Option 2", "is_correct": false}]}]'
                rows={10}
              />
            </JsonTextAreaContainer>
            
            {importErrors.length > 0 && (
              <ImportErrors>
                <h4>Validation Errors:</h4>
                <ul>
                  {importErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </ImportErrors>
            )}
            
            <ButtonGroup>
              <ActionButton type="button" onClick={handleCloseModal}>
                Cancel
              </ActionButton>
              <ActionButton 
                type="button" 
                primary
                onClick={handleJsonImport}
                disabled={!jsonInput.trim() || importLoading}
              >
                {importLoading ? <FaSpinner className="spinner" /> : 'Validate JSON'}
              </ActionButton>
            </ButtonGroup>
          </ModalBody>
        );
        
      case 'import-csv':
        return (
          <ModalBody>
            <ImportHeader>
              <ModalBackButton onClick={() => setModalView('form')}>
                <FaArrowLeft /> Back
              </ModalBackButton>
              <h2>Import Questions from CSV</h2>
            </ImportHeader>
            
            <ImportInstructions>
              <InstructionStep>
                <StepNumber>1</StepNumber>
                <StepText>
                  <h4>Download and fill the CSV template</h4>
                  <p>The CSV should include columns for question_text, difficulty, topic_id (or topic_name), and options.</p>
                  <ActionButton secondary onClick={downloadCsvTemplate} small>
                    <FaFileUpload /> Download Template
                  </ActionButton>
                </StepText>
              </InstructionStep>
              
              <InstructionStep>
                <StepNumber>2</StepNumber>
                <StepText>
                  <h4>Upload your CSV file</h4>
                </StepText>
              </InstructionStep>
            </ImportInstructions>
            
            <FileUploadContainer>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <FileUploadButton onClick={() => fileInputRef.current.click()}>
                <FaUpload /> Select CSV File
              </FileUploadButton>
              {csvFile && (
                <SelectedFile>
                  <FaCheck className="file-icon" />
                  {csvFile.name}
                </SelectedFile>
              )}
            </FileUploadContainer>
            
            {importErrors.length > 0 && (
              <ImportErrors>
                <h4>Validation Errors:</h4>
                <ul>
                  {importErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </ImportErrors>
            )}
            
            <ButtonGroup>
              <ActionButton type="button" onClick={handleCloseModal}>
                Cancel
              </ActionButton>
            </ButtonGroup>
          </ModalBody>
        );
        
      case 'import-preview':
        return (
          <ModalBody>
            <ModalBackButton onClick={() => setModalView(importMethod === 'json' ? 'import-json' : 'import-csv')}>
              <FaArrowLeft /> Back to Edit
            </ModalBackButton>
            
            <h3>Preview ({importedQuestions.length} questions)</h3>
            <QuestionsPreview>
              {importedQuestions.slice(0, 3).map((question, index) => (
                <PreviewQuestion key={index}>
                  <h4>{index + 1}. {question.question_text}</h4>
                  <PreviewDetails>
                    <span>Difficulty: {question.difficulty}</span>
                    <span>Topic: {question.topic_name || `ID: ${question.topic_id}`}</span>
                  </PreviewDetails>
                  <PreviewOptions>
                    {question.options.map((option, optIndex) => (
                      <PreviewOption key={optIndex} correct={option.is_correct}>
                        {option.option_text} {option.is_correct && <FaCheck className="correct-icon" />}
                      </PreviewOption>
                    ))}
                  </PreviewOptions>
                </PreviewQuestion>
              ))}
              {importedQuestions.length > 3 && (
                <MoreQuestions>
                  ...and {importedQuestions.length - 3} more questions
                </MoreQuestions>
              )}
            </QuestionsPreview>
            
            {formData.subject_id ? (
              <ButtonGroup>
                <ActionButton type="button" onClick={handleCloseModal}>
                  Cancel
                </ActionButton>
                <ActionButton 
                  type="button" 
                  primary
                  onClick={saveImportedQuestions}
                  disabled={importLoading}
                >
                  {importLoading ? <FaSpinner className="spinner" /> : 'Import Questions'}
                </ActionButton>
              </ButtonGroup>
            ) : (
              <ImportWarning>
                Please select a subject before importing questions.
              </ImportWarning>
            )}
          </ModalBody>
        );
        
      default:
        return null;
    }
  };

  // Update the renderQuestions function to better handle missing relationships
  const renderQuestions = () => {
    if (loading) {
      return <Loading>Loading questions...</Loading>;
    }
    
    if (error) {
      return <Error>{error}</Error>;
    }
    
    if (questions.length === 0) {
      return (
        <EmptyState>
          <p>No questions found. Try clearing filters or add a new question.</p>
          <ActionButton primary onClick={handleCreateQuestion}>
            <FaPlus /> Add New Question
          </ActionButton>
        </EmptyState>
      );
    }
    
    return (
      <QuestionsGrid>
        {questions.map(question => {
          // Find the subject name from the topics relationship
          const subjectName = question.topics?.subjects?.subject_name || 
            (filterSubject ? subjects.find(s => s.id.toString() === filterSubject)?.subject_name : 'Unknown Subject');
          
          // Find the topic name from the topics relationship
          const topicName = question.topics?.topic_name || 
            (filterTopic ? topics.find(t => t.id.toString() === filterTopic)?.topic_name : 'Unknown Topic');
          
          return (
            <QuestionCard key={question.id}>
              <QuestionHeader>
                <QuestionDifficulty difficulty={question.difficulty || 'medium'}>
                  {question.difficulty || 'medium'}
                </QuestionDifficulty>
                <QuestionActions>
                  <ActionIcon onClick={() => handleViewSolution(question)}>
                    <FaEye />
                  </ActionIcon>
                  <ActionIcon onClick={() => {
                    // Close solution modal if open
                    if (showSolutionModal) {
                      setShowSolutionModal(false);
                    }
                    handleEditQuestion(question);
                  }}>
                    <FaEdit />
                  </ActionIcon>
                  <ActionIcon danger onClick={() => handleDeleteQuestion(question.id)}>
                    <FaTrash />
                  </ActionIcon>
                </QuestionActions>
              </QuestionHeader>
              
              <QuestionText>{question.question_text}</QuestionText>
              
              <QuestionMeta>
                <MetaItem>
                  <MetaLabel>Subject:</MetaLabel>
                  <MetaValue>{subjectName}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Topic:</MetaLabel>
                  <MetaValue>{topicName}</MetaValue>
                </MetaItem>
              </QuestionMeta>
              
              <OptionsGrid>
                {question.question_options && question.question_options.map(option => (
                  <OptionItem key={option.id} correct={option.is_correct}>
                    <OptionText>{option.option_text}</OptionText>
                    {option.is_correct && <FaCheck className="correct-icon" />}
                  </OptionItem>
                ))}
              </OptionsGrid>
            </QuestionCard>
          );
        })}
      </QuestionsGrid>
    );
  };
  
  // Add a function to handle viewing a solution
  const handleViewSolution = (question) => {
    // Make a copy of the question with safe access to nested properties
    const safeQuestion = {
      ...question,
      topics: question.topics || { topic_name: 'Unknown Topic', subjects: { subject_name: 'Unknown Subject' } },
      question_options: question.question_options || []
    };
    
    setCurrentSolution(safeQuestion);
    setShowSolutionModal(true);
  };
  
  // Add a solution modal component
  const renderSolutionModal = () => {
    if (!showSolutionModal || !currentSolution) return null;
    
    return (
      <Modal onClick={() => setShowSolutionModal(false)}>
        <SolutionModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <h2>Question Solution</h2>
            <CloseButton onClick={() => setShowSolutionModal(false)}>
              <FaTimes />
            </CloseButton>
          </ModalHeader>
          
          <ModalBody>
            <SolutionQuestion>
              <h3>Question:</h3>
              <p>{currentSolution.question_text}</p>
            </SolutionQuestion>
            
            <SolutionOptions>
              <h3>Options:</h3>
              <OptionsGrid>
                {currentSolution.question_options.map(option => (
                  <OptionItem key={option.id} correct={option.is_correct}>
                    <OptionText>{option.option_text}</OptionText>
                    {option.is_correct && <FaCheck className="correct-icon" />}
                  </OptionItem>
                ))}
              </OptionsGrid>
            </SolutionOptions>
            
            <SolutionExplanation>
              <h3>Explanation:</h3>
              {currentSolution.explanation ? (
                <p>{currentSolution.explanation}</p>
              ) : (
                <NoExplanation>No explanation provided</NoExplanation>
              )}
            </SolutionExplanation>
            
            <SolutionMeta>
              <MetaItem>
                <MetaLabel>Difficulty:</MetaLabel>
                <MetaValue>{currentSolution.difficulty}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Subject:</MetaLabel>
                <MetaValue>{currentSolution.topics.subjects.subject_name}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Topic:</MetaLabel>
                <MetaValue>{currentSolution.topics.topic_name}</MetaValue>
              </MetaItem>
            </SolutionMeta>
          </ModalBody>
          
          <ModalFooter>
            <ActionButton onClick={() => setShowSolutionModal(false)}>
              Close
            </ActionButton>
            <ActionButton primary onClick={() => handleEditQuestion(currentSolution)}>
              <FaEdit /> Edit Question
            </ActionButton>
          </ModalFooter>
        </SolutionModalContent>
      </Modal>
    );
  };

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
            <Select>
              <select
                id="filter-subject"
                value={filterSubject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="filter-topic">Topic</Label>
            <Select>
              <select
                id="filter-topic"
                value={filterTopic}
                onChange={(e) => handleFilterChange('topic', e.target.value)}
                disabled={!filterSubject}
              >
                <option value="">All Topics</option>
                {filteredTopics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.topic_name}
                  </option>
                ))}
              </select>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="filter-difficulty">Difficulty</Label>
            <Select>
              <select
                id="filter-difficulty"
                value={filterDifficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Select>
          </FormGroup>
          
          <FilterButtons>
            <ActionButton type="button" onClick={handleClearFilters}>Clear Filters</ActionButton>
          </FilterButtons>
        </FilterGrid>
      </FilterPanel>

      {renderQuestions()}

      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>{currentQuestion ? 'Edit Question' : 'Add New Question'}</h2>
              <CloseButton onClick={handleCloseModal}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            
            {renderModalContent()}
            
            {importSuccess && (
              <ImportSuccess>
                <FaCheck className="success-icon" />
                <p>Questions imported successfully!</p>
              </ImportSuccess>
            )}
          </ModalContent>
        </Modal>
      )}
      
      {renderSolutionModal()}
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

const QuestionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  margin-top: 24px;
`;

const QuestionCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
  
  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const QuestionDifficulty = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  ${typography.textXsRegular};
  text-transform: capitalize;
  background-color: ${props => {
    switch (props.difficulty) {
      case 'easy': return '#d1fae5';
      case 'medium': return '#fef3c7';
      case 'hard': return '#fee2e2';
      default: return '#e5e7eb';
    }
  }};
  color: ${props => {
    switch (props.difficulty) {
      case 'easy': return '#065f46';
      case 'medium': return '#92400e';
      case 'hard': return '#b91c1c';
      default: return '#374151';
    }
  }};
`;

const QuestionActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionIcon = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.danger ? '#fee2e2' : colors.backgroundSecondary};
  color: ${props => props.danger ? '#b91c1c' : colors.textSecondary};
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.danger ? '#fecaca' : '#e5e7eb'};
    color: ${props => props.danger ? '#991b1b' : colors.textPrimary};
  }
`;

const QuestionText = styled.p`
  ${typography.textMdMedium};
  color: ${colors.textPrimary};
  margin: 0;
  line-height: 1.5;
`;

const QuestionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MetaLabel = styled.span`
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
`;

const MetaValue = styled.span`
  ${typography.textSmRegular};
  color: ${colors.textPrimary};
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
`;

const OptionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: white;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${colors.brandPrimary || '#4f46e5'};
  }
`;

const OptionText = styled.span`
  flex: 1;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  background-color: ${colors.backgroundSecondary};
  border-radius: 8px;
  margin-top: 24px;
  
  p {
    ${typography.textMdRegular};
    color: ${colors.textSecondary};
    margin-bottom: 16px;
  }
`;

const SolutionModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const SolutionQuestion = styled.div`
  margin-bottom: 24px;
  
  h3 {
    ${typography.textLgBold};
    color: ${colors.textPrimary};
    margin: 0 0 8px 0;
  }
  
  p {
    ${typography.textMdRegular};
    color: ${colors.textPrimary};
    margin: 0;
    line-height: 1.6;
  }
`;

const SolutionOptions = styled.div`
  margin-bottom: 24px;
  
  h3 {
    ${typography.textLgBold};
    color: ${colors.textPrimary};
    margin: 0 0 12px 0;
  }
`;

const SolutionExplanation = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid ${colors.brandPrimary};
  
  h3 {
    ${typography.textLgBold};
    color: ${colors.textPrimary};
    margin: 0 0 12px 0;
  }
  
  p {
    ${typography.textMdRegular};
    color: ${colors.textPrimary};
    margin: 0;
    line-height: 1.6;
  }
`;

const NoExplanation = styled.p`
  ${typography.textMdItalic};
  color: ${colors.textSecondary};
`;

const SolutionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  background-color: ${colors.backgroundSecondary};
  border-radius: 8px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${colors.borderPrimary};
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
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  background-color: white;
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  
  &:disabled {
    background-color: ${colors.backgroundSecondary || '#f3f4f6'};
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${colors.textTertiary || '#9ca3af'};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  background-color: white;
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  
  &:disabled {
    background-color: ${colors.backgroundSecondary || '#f3f4f6'};
    cursor: not-allowed;
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
    border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
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
    
    &:disabled {
      background-color: ${colors.backgroundSecondary || '#f3f4f6'};
      cursor: not-allowed;
      color: ${colors.textSecondary || '#6b7280'};
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
  margin-top: 6px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
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

const OptionInput = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
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

const ImportSection = styled.div`
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid ${colors.borderPrimary};
`;

const ImportHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  
  h2 {
    ${typography.headingMd || 'font-size: 1.25rem; font-weight: 700;'};
    margin: 0;
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

const ImportInstructions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
`;

const InstructionStep = styled.div`
  display: flex;
  gap: 16px;
`;

const StepNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${colors.brandPrimary || '#4f46e5'};
  color: white;
  ${typography.textMdBold || 'font-size: 1rem; font-weight: 700;'};
`;

const StepText = styled.div`
  flex: 1;
  
  h4 {
    ${typography.textMdBold || 'font-size: 1rem; font-weight: 700;'};
    margin: 0 0 8px 0;
    color: ${colors.textPrimary || '#1f2937'};
  }
  
  p {
    ${typography.textSmRegular || 'font-size: 0.875rem;'};
    margin: 0 0 12px 0;
    color: ${colors.textSecondary || '#6b7280'};
  }
`;

const JsonTextAreaContainer = styled.div`
  position: relative;
  margin-bottom: 24px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 8px;
    background: linear-gradient(to right, #6366f1, #8b5cf6);
    border-radius: 8px 8px 0 0;
    z-index: 1;
  }
  
  textarea {
    border-radius: 0 0 8px 8px;
    border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
    border-top: none;
    padding: 16px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
    font-size: 14px;
    line-height: 1.5;
    
    &:focus {
      outline: none;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
  }
`;

const ImportBanner = styled.div`
  margin: -24px -24px 24px -24px;
  background: linear-gradient(135deg, ${colors.brandPrimary || '#4f46e5'} 0%, #6366f1 100%);
  border-radius: 8px 8px 0 0;
  padding: 24px;
  color: white;
`;

const ImportBannerContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const ImportBannerText = styled.div`
  h3 {
    ${typography.headingLg || 'font-size: 1.5rem; font-weight: 700;'};
    margin: 0 0 8px 0;
  }
  
  p {
    ${typography.textMdRegular || 'font-size: 1rem;'};
    margin: 0;
    opacity: 0.9;
  }
`;

const ImportBannerOptions = styled.div`
  display: flex;
  gap: 12px;
`;

const ImportBannerOption = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 10px 16px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  
  svg {
    font-size: 18px;
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const FormDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 0 0 24px 0;
  
  &::before, &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  }
`;

const FormDividerText = styled.span`
  padding: 0 16px;
  ${typography.textSmMedium || 'font-size: 0.875rem; font-weight: 500;'};
  color: ${colors.textSecondary || '#6b7280'};
`;

const QuestionsPreview = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin: 16px 0;
  border: 1px solid ${colors.borderPrimary};
  border-radius: 8px;
`;

const PreviewQuestion = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${colors.borderPrimary};
  
  &:last-child {
    border-bottom: none;
  }
  
  h4 {
    ${typography.textMdBold};
    margin: 0 0 12px 0;
    color: ${colors.textPrimary};
  }
`;

const PreviewDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
  
  span {
    ${typography.textSmRegular};
    color: ${colors.textSecondary};
  }
`;

const PreviewOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
`;

const PreviewOption = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: ${props => props.correct ? '#d1fae5' : colors.backgroundSecondary};
  color: ${props => props.correct ? '#065f46' : colors.textPrimary};
  border-radius: 4px;
  ${typography.textSmRegular};
  
  .correct-icon {
    color: #10b981;
  }
`;

const MoreQuestions = styled.div`
  text-align: center;
  padding: 12px;
  ${typography.textSmItalic};
  color: ${colors.textSecondary};
`;

const ImportWarning = styled.div`
  margin: 16px 0;
  padding: 12px 16px;
  background-color: #fff7ed;
  border-radius: 6px;
  ${typography.textSmRegular};
  color: #c2410c;
`;

const ImportSuccess = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  
  .success-icon {
    font-size: 48px;
    color: #10b981;
    margin-bottom: 16px;
  }
  
  p {
    ${typography.textLgBold};
    color: ${colors.textPrimary};
  }
`;

const ModalBackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 8px 0;
  margin-bottom: 16px;
  cursor: pointer;
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
  
  &:hover {
    color: ${colors.textPrimary};
  }
`;

const ImportErrors = styled.div`
  margin: 16px 0;
  padding: 12px 16px;
  background-color: #fee2e2;
  border-radius: 6px;
  
  h4 {
    ${typography.textSmBold};
    color: #b91c1c;
    margin: 0 0 8px 0;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      ${typography.textSmRegular};
      color: #b91c1c;
    }
  }
`;

const FileUploadContainer = styled.div`
  margin: 16px 0;
`;

const FileUploadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background-color: ${colors.backgroundSecondary};
  border: 1px dashed ${colors.borderPrimary};
  border-radius: 8px;
  cursor: pointer;
  ${typography.textMdRegular};
  color: ${colors.textPrimary};
  
  &:hover {
    background-color: ${colors.backgroundPrimary};
    border-color: ${colors.brandPrimary};
  }
`;

const SelectedFile = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background-color: ${colors.backgroundSecondary};
  border-radius: 6px;
  ${typography.textSmRegular};
  color: ${colors.textPrimary};
  
  .file-icon {
    color: #10b981;
  }
`;

const ActionButton = styled.button`
  padding: ${props => props.small ? '8px 12px' : '10px 16px'};
  border-radius: 6px;
  background-color: ${props => props.primary ? colors.brandPrimary || '#4f46e5' : props.secondary ? colors.backgroundSecondary || '#f3f4f6' : 'white'};
  color: ${props => props.primary ? 'white' : props.secondary ? colors.textPrimary || '#1f2937' : colors.textSecondary || '#6b7280'};
  border: 1px solid ${props => props.primary ? 'transparent' : props.secondary ? 'transparent' : colors.borderPrimary || '#e5e7eb'};
  ${props => props.small ? typography.textSmMedium || 'font-size: 0.875rem; font-weight: 500;' : typography.textMdMedium || 'font-size: 1rem; font-weight: 500;'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.primary ? colors.brandPrimaryDark || '#3c3599' : props.secondary ? '#e5e7eb' : '#f9fafb'};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const CheckboxInput = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid ${colors.borderPrimary || '#e5e7eb'};
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  
  &:checked {
    background-color: ${colors.brandPrimary || '#4f46e5'};
    border-color: ${colors.brandPrimary || '#4f46e5'};
  }
  
  &:checked::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 6px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
`;

const CheckboxLabel = styled.label`
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  cursor: pointer;
`;

const FiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 24px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const FilterGroup = styled.div`
  flex: 1;
  min-width: 200px;
`;

const FilterActions = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: auto;
  flex: 1;
`;

export default AdminQuestions; 