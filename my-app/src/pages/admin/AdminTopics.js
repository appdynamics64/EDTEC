import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const AdminTopics = () => {
  // State variables
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    topic_name: '',
    subject_id: ''
  });
  
  // Fetch data on component mount
  useEffect(() => {
    fetchSubjects();
    fetchTopics();
  }, []);
  
  // Fetch subjects from Supabase
  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_name');
      
      if (error) throw error;
      
      setSubjects(data || []);
      
      // Initialize expanded state for all subjects as collapsed (false) by default
      const expandedState = {};
      data.forEach(subject => {
        expandedState[subject.id] = false; // Start with all collapsed
      });
      setExpandedSubjects(expandedState);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError('Failed to load subjects');
    }
  };
  
  // Fetch topics with subject data
  const fetchTopics = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id,
          topic_name,
          subject_id,
          subjects (
            id,
            subject_name
          )
        `)
        .order('topic_name');
      
      if (error) throw error;
      
      // For each topic, fetch the question count
      const topicsWithCounts = await Promise.all(
        data.map(async (topic) => {
          const { count, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);
          
          if (countError) {
            console.error('Error fetching question count:', countError);
            return { ...topic, questionCount: 0 };
          }
          
          return { ...topic, questionCount: count || 0 };
        })
      );
      
      setTopics(topicsWithCounts);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setError('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle subject expansion
  const toggleSubjectExpansion = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Open modal to add a new topic
  const handleAddTopic = () => {
    setCurrentTopic(null);
    setFormData({
      topic_name: '',
      subject_id: subjects.length > 0 ? subjects[0].id.toString() : ''
    });
    setShowAddModal(true);
  };
  
  // Open modal to edit an existing topic
  const handleEditTopic = (topic) => {
    setCurrentTopic(topic);
    setFormData({
      topic_name: topic.topic_name,
      subject_id: topic.subject_id.toString()
    });
    setShowAddModal(true);
  };
  
  // Handle topic deletion
  const handleDeleteTopic = (topic) => {
    setTopicToDelete(topic);
    setShowDeleteConfirmation(true);
  };
  
  // Add a function to confirm deletion
  const confirmDeleteTopic = async () => {
    try {
      // First delete all questions associated with this topic
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('topic_id', topicToDelete.id);
      
      if (questionsError) throw questionsError;
      
      // Then delete the topic
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicToDelete.id);
      
      if (error) throw error;
      
      // Close the confirmation modal and refresh topics
      setShowDeleteConfirmation(false);
      setTopicToDelete(null);
      fetchTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic. Please try again.');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.topic_name.trim() || !formData.subject_id) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      if (currentTopic) {
        // Update existing topic
        const { error } = await supabase
          .from('topics')
          .update({
            topic_name: formData.topic_name.trim(),
            subject_id: parseInt(formData.subject_id)
          })
          .eq('id', currentTopic.id);
        
        if (error) throw error;
      } else {
        // Create new topic
        const { error } = await supabase
          .from('topics')
          .insert({
            topic_name: formData.topic_name.trim(),
            subject_id: parseInt(formData.subject_id)
          });
        
        if (error) throw error;
      }
      
      // Close modal and refresh topics
      setShowAddModal(false);
      fetchTopics();
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('Failed to save topic. Please try again.');
    }
  };
  
  // Filter topics based on search term and selected subject
  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.topic_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject ? topic.subject_id === parseInt(filterSubject) : true;
    return matchesSearch && matchesSubject;
  });
  
  // Group topics by subject for the organized view
  const topicsBySubject = {};
  subjects.forEach(subject => {
    topicsBySubject[subject.id] = filteredTopics.filter(
      topic => topic.subject_id === subject.id
    );
  });
  
  return (
    <Container>
      <Header>
        <h1>Topics Management</h1>
        <ActionButton primary onClick={handleAddTopic}>
          <FaPlus /> Add New Topic
        </ActionButton>
      </Header>
      
      <FiltersContainer>
        <SearchContainer>
          <label htmlFor="topic-search">Search</label>
          <InputWrapper>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              id="topic-search"
              type="text"
              placeholder="Search topics..."
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
          <label htmlFor="subject-filter">Subject</label>
          <InputWrapper>
            <FilterSelect
              id="subject-filter"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.subject_name}
                </option>
              ))}
            </FilterSelect>
            <SelectIcon>
              <FaChevronDown />
            </SelectIcon>
          </InputWrapper>
        </FilterSelectContainer>
      </FiltersContainer>
      
      {loading ? (
        <Loading>Loading topics...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : (
        <ContentContainer>
          {/* Organized view by subject */}
          <OrganizedView>
            {subjects.map(subject => (
              <SubjectSection key={subject.id}>
                <SubjectHeader onClick={() => toggleSubjectExpansion(subject.id)}>
                  <SubjectInfo>
                    <SubjectName>{subject.subject_name}</SubjectName>
                    <TopicCount>
                      {topicsBySubject[subject.id]?.length || 0} topics
                    </TopicCount>
                  </SubjectInfo>
                  {expandedSubjects[subject.id] ? <FaChevronUp /> : <FaChevronDown />}
                </SubjectHeader>
                
                {expandedSubjects[subject.id] && (
                  <TopicsList>
                    {topicsBySubject[subject.id]?.length > 0 ? (
                      topicsBySubject[subject.id].map(topic => (
                        <TopicCard key={topic.id}>
                          <TopicInfo>
                            <TopicName>{topic.topic_name}</TopicName>
                            <QuestionCount count={topic.questionCount}>
                              {topic.questionCount} questions
                            </QuestionCount>
                          </TopicInfo>
                          <TopicActions>
                            <ActionIcon onClick={() => handleEditTopic(topic)}>
                              <FaEdit />
                            </ActionIcon>
                            <ActionIcon danger onClick={() => handleDeleteTopic(topic)}>
                              <FaTrash />
                            </ActionIcon>
                          </TopicActions>
                        </TopicCard>
                      ))
                    ) : (
                      <EmptyTopics>No topics found for this subject</EmptyTopics>
                    )}
                  </TopicsList>
                )}
              </SubjectSection>
            ))}
          </OrganizedView>
        </ContentContainer>
      )}
      
      {/* Add/Edit Topic Modal */}
      {showAddModal && (
        <Modal onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>{currentTopic ? 'Edit Topic' : 'Add New Topic'}</h2>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="topic_name">Topic Name</Label>
                  <Input
                    id="topic_name"
                    name="topic_name"
                    value={formData.topic_name}
                    onChange={handleInputChange}
                    placeholder="Enter topic name"
                    required
                  />
                </FormGroup>
                
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
                </FormGroup>
                
                <ButtonGroup>
                  <Button type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" primary>
                    {currentTopic ? 'Update Topic' : 'Add Topic'}
                  </Button>
                </ButtonGroup>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
      
      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmDeleteTopic}
        title="Delete Topic"
        message={`Are you sure you want to delete "${topicToDelete?.topic_name}"? This will also delete all associated questions. This action cannot be undone.`}
      />
    </Container>
  );
};

// Styled Components
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

const OrganizedView = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SubjectSection = styled.div`
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

const SubjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(to right, ${colors.backgroundSecondary || '#f9fafb'}, white);
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  
  &:hover {
    background: linear-gradient(to right, #f3f4f6, white);
  }
`;

const SubjectInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SubjectName = styled.h3`
  ${typography.textLgBold || 'font-size: 1.125rem; font-weight: 700;'};
  color: ${colors.textPrimary || '#1f2937'};
  margin: 0;
`;

const TopicCount = styled.span`
  ${typography.textSmRegular || 'font-size: 0.875rem;'};
  color: ${colors.textSecondary || '#6b7280'};
  background: linear-gradient(to right, #e5e7eb, #f3f4f6);
  padding: 6px 10px;
  border-radius: 20px;
  font-weight: 500;
`;

const TopicsList = styled.div`
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopicCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: white;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  border-radius: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-3px);
  }
`;

const TopicInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TopicName = styled.h4`
  ${typography.textMdMedium || 'font-size: 1rem; font-weight: 500;'};
  color: ${colors.textPrimary || '#1f2937'};
  margin: 0;
`;

const QuestionCount = styled.span`
  ${typography.textSmRegular || 'font-size: 0.875rem;'};
  color: ${colors.textSecondary || '#6b7280'};
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.count > 0 ? '#10b981' : '#9ca3af'};
  }
`;

const TopicActions = styled.div`
  display: flex;
  gap: 8px;
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
`;

const EmptyTopics = styled.div`
  padding: 16px;
  text-align: center;
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textSecondary || '#6b7280'};
  background-color: ${colors.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
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
  width: 500px;
  max-width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
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
  background-color: ${colors.backgroundPrimary || '#ffffff'};
  
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
  background-color: ${props => props.primary ? colors.brandPrimary || '#4f46e5' : colors.backgroundSecondary || '#f3f4f6'};
  color: ${props => props.primary ? 'white' : colors.textPrimary || '#1f2937'};
  ${typography.textMdMedium || 'font-size: 1rem; font-weight: 500;'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: ${props => props.primary ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'};
  
  &:hover {
    background-color: ${props => props.primary ? colors.brandPrimaryDark || '#4338ca' : '#e5e7eb'};
    transform: translateY(-2px);
    box-shadow: ${props => props.primary ? '0 6px 16px rgba(79, 70, 229, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.05)'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.primary ? 'rgba(79, 70, 229, 0.4)' : 'rgba(156, 163, 175, 0.4)'};
  }
`;

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  
  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <ModalHeader>
          <h2>{title}</h2>
          <CloseButton onClick={onClose}>
            <FaTimes />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          <p style={{ marginBottom: '24px', color: colors.textSecondary || '#6b7280' }}>{message}</p>
          <ButtonGroup>
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={onConfirm} style={{ backgroundColor: '#ef4444' }}>
              <FaTrash /> Delete
            </Button>
          </ButtonGroup>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default AdminTopics; 