import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaBook } from 'react-icons/fa';

const AdminSubjects = () => {
  // State variables
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    subject_name: ''
  });
  
  // Fetch data on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);
  
  // Fetch subjects with topic counts
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      
      // First get all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_name');
      
      if (subjectsError) throw subjectsError;
      
      // For each subject, get the topic count
      const subjectsWithCounts = await Promise.all(
        subjectsData.map(async (subject) => {
          // Get topics count
          const { count: topicsCount, error: topicsError } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subject.id);
          
          if (topicsError) {
            console.error('Error fetching topics count:', topicsError);
            return { ...subject, topicsCount: 0, questionsCount: 0 };
          }
          
          // Get questions count for this subject's topics
          const { data: topics, error: topicsListError } = await supabase
            .from('topics')
            .select('id')
            .eq('subject_id', subject.id);
          
          if (topicsListError) {
            console.error('Error fetching topics list:', topicsListError);
            return { ...subject, topicsCount: topicsCount || 0, questionsCount: 0 };
          }
          
          let questionsCount = 0;
          
          if (topics && topics.length > 0) {
            const topicIds = topics.map(t => t.id);
            
            const { count: qCount, error: questionsError } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .in('topic_id', topicIds);
            
            if (!questionsError) {
              questionsCount = qCount || 0;
            }
          }
          
          return {
            ...subject,
            topicsCount: topicsCount || 0,
            questionsCount: questionsCount
          };
        })
      );
      
      setSubjects(subjectsWithCounts);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Open modal to add a new subject
  const handleAddSubject = () => {
    setCurrentSubject(null);
    setFormData({
      subject_name: ''
    });
    setShowAddModal(true);
  };
  
  // Open modal to edit an existing subject
  const handleEditSubject = (subject) => {
    setCurrentSubject(subject);
    setFormData({
      subject_name: subject.subject_name
    });
    setShowAddModal(true);
  };
  
  // Handle subject deletion
  const handleDeleteSubject = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteConfirmation(true);
  };
  
  // Confirm subject deletion
  const confirmDeleteSubject = async () => {
    try {
      // Check if there are topics associated with this subject
      if (subjectToDelete.topicsCount > 0) {
        // First get all topics for this subject
        const { data: topics, error: topicsError } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', subjectToDelete.id);
        
        if (topicsError) throw topicsError;
        
        // Delete all questions for these topics
        if (topics.length > 0) {
          const topicIds = topics.map(t => t.id);
          
          const { error: questionsError } = await supabase
            .from('questions')
            .delete()
            .in('topic_id', topicIds);
          
          if (questionsError) throw questionsError;
        }
        
        // Delete all topics for this subject
        const { error: deleteTopicsError } = await supabase
          .from('topics')
          .delete()
          .eq('subject_id', subjectToDelete.id);
        
        if (deleteTopicsError) throw deleteTopicsError;
      }
      
      // Finally delete the subject
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete.id);
      
      if (error) throw error;
      
      // Close the confirmation modal and refresh subjects
      setShowDeleteConfirmation(false);
      setSubjectToDelete(null);
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject_name.trim()) {
      alert('Please enter a subject name');
      return;
    }
    
    try {
      if (currentSubject) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update({
            subject_name: formData.subject_name.trim()
          })
          .eq('id', currentSubject.id);
        
        if (error) throw error;
      } else {
        // Create new subject
        const { error } = await supabase
          .from('subjects')
          .insert({
            subject_name: formData.subject_name.trim()
          });
        
        if (error) throw error;
      }
      
      // Close modal and refresh subjects
      setShowAddModal(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject. Please try again.');
    }
  };
  
  // Filter subjects based on search term
  const filteredSubjects = subjects.filter(subject =>
    subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <Container>
      <Header>
        <h1>Subjects Management</h1>
        <ActionButton primary onClick={handleAddSubject}>
          <FaPlus /> Add New Subject
        </ActionButton>
      </Header>
      
      <FiltersContainer>
        <SearchContainer>
          <label htmlFor="subject-search">Search</label>
          <InputWrapper>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              id="subject-search"
              type="text"
              placeholder="Search subjects..."
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
      </FiltersContainer>
      
      {loading ? (
        <Loading>Loading subjects...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : (
        <ContentContainer>
          <SubjectsGrid>
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map(subject => (
                <SubjectCard key={subject.id}>
                  <SubjectIcon>
                    <FaBook />
                  </SubjectIcon>
                  <SubjectInfo>
                    <SubjectName>{subject.subject_name}</SubjectName>
                    <SubjectStats>
                      <StatItem>
                        <StatLabel>Topics:</StatLabel>
                        <StatValue>{subject.topicsCount}</StatValue>
                      </StatItem>
                      <StatItem>
                        <StatLabel>Questions:</StatLabel>
                        <StatValue>{subject.questionsCount}</StatValue>
                      </StatItem>
                    </SubjectStats>
                  </SubjectInfo>
                  <SubjectActions>
                    <ActionIcon onClick={() => handleEditSubject(subject)}>
                      <FaEdit />
                    </ActionIcon>
                    <ActionIcon danger onClick={() => handleDeleteSubject(subject)}>
                      <FaTrash />
                    </ActionIcon>
                  </SubjectActions>
                </SubjectCard>
              ))
            ) : (
              <EmptyState>
                <p>No subjects found. {searchTerm ? 'Try a different search term or ' : ''}add a new subject to get started.</p>
                <ActionButton primary onClick={handleAddSubject}>
                  <FaPlus /> Add New Subject
                </ActionButton>
              </EmptyState>
            )}
          </SubjectsGrid>
        </ContentContainer>
      )}
      
      {/* Add/Edit Subject Modal */}
      {showAddModal && (
        <Modal onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>{currentSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="subject_name">Subject Name</Label>
                  <Input
                    id="subject_name"
                    name="subject_name"
                    value={formData.subject_name}
                    onChange={handleInputChange}
                    placeholder="Enter subject name"
                    required
                  />
                </FormGroup>
                
                <ButtonGroup>
                  <Button type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" primary>
                    {currentSubject ? 'Update Subject' : 'Add Subject'}
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
        onConfirm={confirmDeleteSubject}
        title="Delete Subject"
        message={`Are you sure you want to delete "${subjectToDelete?.subject_name}"? This will also delete all associated topics and questions. This action cannot be undone.`}
      />
    </Container>
  );
};

// Styled Components - Matching the AdminTopics styling
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

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SubjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
`;

const SubjectCard = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  padding: 20px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
`;

const SubjectIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${colors.brandPrimary || '#4f46e5'} 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-right: 16px;
  flex-shrink: 0;
`;

const SubjectInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SubjectName = styled.h3`
  ${typography.textLgBold || 'font-size: 1.125rem; font-weight: 700;'};
  color: ${colors.textPrimary || '#1f2937'};
  margin: 0;
`;

const SubjectStats = styled.div`
  display: flex;
  gap: 16px;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatLabel = styled.span`
  ${typography.textSmRegular || 'font-size: 0.875rem;'};
  color: ${colors.textSecondary || '#6b7280'};
`;

const StatValue = styled.span`
  ${typography.textSmBold || 'font-size: 0.875rem; font-weight: 600;'};
  color: ${colors.textPrimary || '#1f2937'};
`;

const SubjectActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
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

const EmptyState = styled.div`
  grid-column: 1 / -1;
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

export default AdminSubjects; 