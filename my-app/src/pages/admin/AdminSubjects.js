import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaCheck } from 'react-icons/fa';

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ subject_name: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      
      // Get subjects with topic counts
      const { data, error } = await supabase
        .from('subjects')
        .select('id, subject_name, created_at, updated_at')
        .order('subject_name');
      
      if (error) throw error;
      
      // Get topic counts and question counts for each subject
      const subjectsWithCounts = await Promise.all(data.map(async (subject) => {
        // Get topic counts for this subject
        const { count: topicCount, error: topicError } = await supabase
          .from('topics')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.id);
          
        if (topicError) throw topicError;
        
        // Get all topic IDs for this subject
        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', subject.id);
          
        if (topicsError) throw topicsError;
        
        // Extract topic IDs
        const topicIds = topicsData.map(topic => topic.id);
        
        // Get question count only if there are topics
        let questionCount = 0;
        if (topicIds.length > 0) {
          const { count, error: questionError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('topic_id', topicIds);
            
          if (questionError) throw questionError;
          questionCount = count || 0;
        }
        
        return {
          ...subject,
          topicCount: topicCount || 0,
          questionCount: questionCount
        };
      }));
      
      setSubjects(subjectsWithCounts);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = () => {
    setCurrentSubject(null);
    setFormData({ subject_name: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditSubject = (subject) => {
    setCurrentSubject(subject);
    setFormData({ subject_name: subject.subject_name });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteSubject = async (subjectId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this subject? This will also delete all associated topics and questions.')) {
        return;
      }
      
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);
      
      if (error) throw error;
      
      // Refresh subjects list
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject. It may be referenced by topics or questions.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.subject_name.trim()) {
      errors.subject_name = 'Subject name is required';
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
      if (currentSubject) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update({ 
            subject_name: formData.subject_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSubject.id);
        
        if (error) throw error;
      } else {
        // Create new subject
        const { error } = await supabase
          .from('subjects')
          .insert({ 
            subject_name: formData.subject_name
          });
        
        if (error) throw error;
      }
      
      // Close modal and refresh list
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject');
    }
  };

  const filteredSubjects = subjects.filter(subject => 
    subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container>
      <ControlsBar>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FaSearch className="search-icon" />
        </SearchContainer>
        
        <ActionButton primary onClick={handleCreateSubject}>
          <FaPlus /> Add Subject
        </ActionButton>
      </ControlsBar>
      
      {loading ? (
        <Loading>Loading subjects...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState>
          {searchQuery ? 'No subjects found matching your search.' : 'No subjects found. Create your first subject!'}
        </EmptyState>
      ) : (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Topics</th>
                <th>Questions</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(subject => (
                <tr key={subject.id}>
                  <td>{subject.subject_name}</td>
                  <td>{subject.topicCount}</td>
                  <td>{subject.questionCount}</td>
                  <td>{new Date(subject.created_at).toLocaleDateString()}</td>
                  <td>
                    <ActionButtonsContainer>
                      <ActionButton small onClick={() => handleEditSubject(subject)}>
                        <FaEdit />
                      </ActionButton>
                      <ActionButton 
                        small 
                        danger
                        onClick={() => handleDeleteSubject(subject.id)}
                        disabled={subject.topicCount > 0 || subject.questionCount > 0}
                        title={subject.topicCount > 0 ? 'Cannot delete subject with topics' : ''}
                      >
                        <FaTrash />
                      </ActionButton>
                    </ActionButtonsContainer>
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
              <h2>{currentSubject ? 'Edit Subject' : 'Create Subject'}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label htmlFor="subject_name">Subject Name</Label>
                <Input
                  id="subject_name"
                  name="subject_name"
                  value={formData.subject_name}
                  onChange={handleInputChange}
                  error={formErrors.subject_name}
                  placeholder="Enter subject name"
                />
                {formErrors.subject_name && <ErrorText>{formErrors.subject_name}</ErrorText>}
              </FormGroup>
              
              <ButtonGroup>
                <ActionButton onClick={() => setIsModalOpen(false)}>
                  Cancel
                </ActionButton>
                <ActionButton primary onClick={handleSubmit}>
                  {currentSubject ? 'Update Subject' : 'Create Subject'}
                </ActionButton>
              </ButtonGroup>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

// Your existing styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TableContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
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
  
  td {
    ${typography.textMdRegular};
    color: ${colors.textPrimary};
  }
  
  tbody tr:hover {
    background-color: ${colors.backgroundSecondary}40;
  }
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${props => props.small ? '8px' : '10px 16px'};
  border-radius: 6px;
  ${props => props.small ? typography.textSmMedium : typography.textMdMedium};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  background-color: ${props => {
    if (props.disabled) return '#e0e0e0';
    if (props.danger) return colors.accentError || '#f44336';
    if (props.primary) return colors.brandPrimary;
    return colors.backgroundSecondary;
  }};
  color: ${props => {
    if (props.disabled) return colors.textSecondary;
    if (props.danger || props.primary) return 'white';
    return colors.textPrimary;
  }};
  border: none;
  
  &:hover {
    opacity: ${props => props.disabled ? 1 : 0.9};
  }
`;

const ControlsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

// Add these styled components
const SearchContainer = styled.div`
  position: relative;
  width: 300px;
  
  .search-icon {
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    color: ${colors.textSecondary};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 40px;
  border-radius: 6px;
  border: 1px solid ${colors.borderPrimary};
  ${typography.textMd};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  ${typography.textLgMedium};
  color: ${colors.textSecondary};
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

export default AdminSubjects; 