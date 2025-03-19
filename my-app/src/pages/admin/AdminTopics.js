import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaFilter } from 'react-icons/fa';

const AdminTopics = () => {
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [formData, setFormData] = useState({
    topic_name: '',
    subject_id: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchTopics();
    fetchSubjects();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      
      // Get topics with subject info and counts
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id, 
          topic_name, 
          subject_id,
          created_at,
          subjects (
            id,
            subject_name
          )
        `)
        .order('topic_name');
      
      if (error) throw error;
      
      // Get question counts for each topic
      const topicsWithCounts = await Promise.all(data.map(async (topic) => {
        const { count, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topic.id);
          
        if (countError) throw countError;
        
        return {
          ...topic,
          questionCount: count || 0
        };
      }));
      
      setTopics(topicsWithCounts);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setError('Failed to load topics');
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

  const handleCreateTopic = () => {
    setCurrentTopic(null);
    setFormData({
      topic_name: '',
      subject_id: subjects.length > 0 ? subjects[0].id : ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditTopic = (topic) => {
    setCurrentTopic(topic);
    setFormData({
      topic_name: topic.topic_name,
      subject_id: topic.subject_id
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteTopic = async (topicId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this topic? This will also delete all associated questions.')) {
        return;
      }
      
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
      
      if (error) throw error;
      
      // Refresh topics list
      fetchTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic. It may be referenced by questions.');
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
    
    if (!formData.topic_name.trim()) {
      errors.topic_name = 'Topic name is required';
    }
    
    if (!formData.subject_id) {
      errors.subject_id = 'Subject is required';
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
      if (currentTopic) {
        // Update existing topic
        const { error } = await supabase
          .from('topics')
          .update({ 
            topic_name: formData.topic_name,
            subject_id: formData.subject_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTopic.id);
        
        if (error) throw error;
      } else {
        // Create new topic
        const { error } = await supabase
          .from('topics')
          .insert({ 
            topic_name: formData.topic_name,
            subject_id: formData.subject_id
          });
        
        if (error) throw error;
      }
      
      // Close modal and refresh list
      setIsModalOpen(false);
      fetchTopics();
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('Failed to save topic');
    }
  };

  const filteredTopics = topics.filter(topic => {
    // Filter by search query
    const matchesSearch = topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by subject if one is selected
    const matchesSubject = !filterSubject || topic.subject_id === filterSubject;
    
    return matchesSearch && matchesSubject;
  });

  return (
    <Container>
      <ControlsBar>
        <FilterContainer>
          <SearchContainer>
            <SearchInput
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="search-icon" />
          </SearchContainer>
          
          <SelectContainer>
            <Select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.subject_name}
                </option>
              ))}
            </Select>
            <FaFilter className="filter-icon" />
          </SelectContainer>
        </FilterContainer>
        
        <ActionButton primary onClick={handleCreateTopic}>
          <FaPlus /> Add Topic
        </ActionButton>
      </ControlsBar>
      
      {loading ? (
        <Loading>Loading topics...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : filteredTopics.length === 0 ? (
        <EmptyState>
          {searchQuery || filterSubject 
            ? 'No topics found matching your filters.' 
            : 'No topics found. Create your first topic!'}
        </EmptyState>
      ) : (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Topic Name</th>
                <th>Subject</th>
                <th>Questions</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map(topic => (
                <tr key={topic.id}>
                  <td>{topic.topic_name}</td>
                  <td>{topic.subjects?.subject_name}</td>
                  <td>{topic.questionCount}</td>
                  <td>{new Date(topic.created_at).toLocaleDateString()}</td>
                  <td>
                    <ActionButtonsContainer>
                      <ActionButton small onClick={() => handleEditTopic(topic)}>
                        <FaEdit />
                      </ActionButton>
                      <ActionButton 
                        small 
                        danger
                        onClick={() => handleDeleteTopic(topic.id)}
                        disabled={topic.questionCount > 0}
                        title={topic.questionCount > 0 ? 'Cannot delete topic with questions' : ''}
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
              <h2>{currentTopic ? 'Edit Topic' : 'Create Topic'}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label htmlFor="topic_name">Topic Name</Label>
                <Input
                  id="topic_name"
                  name="topic_name"
                  value={formData.topic_name}
                  onChange={handleInputChange}
                  error={formErrors.topic_name}
                  placeholder="Enter topic name"
                />
                {formErrors.topic_name && <ErrorText>{formErrors.topic_name}</ErrorText>}
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="subject_id">Subject</Label>
                <Select
                  id="subject_id"
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleInputChange}
                  error={formErrors.subject_id}
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </Select>
                {formErrors.subject_id && <ErrorText>{formErrors.subject_id}</ErrorText>}
              </FormGroup>
              
              <ButtonGroup>
                <ActionButton onClick={() => setIsModalOpen(false)}>
                  Cancel
                </ActionButton>
                <ActionButton primary onClick={handleSubmit}>
                  {currentTopic ? 'Update Topic' : 'Create Topic'}
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
const FilterContainer = styled.div`
  display: flex;
  gap: 16px;
`;

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

const SelectContainer = styled.div`
  position: relative;
  width: 200px;
  
  .filter-icon {
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    color: ${colors.textSecondary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px 10px ${props => props.error ? '12px' : '40px'};
  border-radius: 6px;
  border: 1px solid ${props => props.error ? colors.accentError : colors.borderPrimary};
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

export default AdminTopics; 