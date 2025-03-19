import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaPlus, FaFilter } from 'react-icons/fa';

const AdminScoringRules = () => {
  const [scoringRules, setScoringRules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  const [filterExam, setFilterExam] = useState('');
  const [formData, setFormData] = useState({
    exam_id: '',
    marks_correct: 1,
    marks_incorrect: 0,
    marks_unanswered: 0
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchScoringRules();
    fetchExams();
  }, []);

  const fetchScoringRules = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('scoring_rules')
        .select(`
          id,
          marks_correct,
          marks_incorrect,
          marks_unanswered,
          created_at,
          exam_id,
          exams (
            id,
            exam_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (filterExam) {
        query = query.eq('exam_id', filterExam);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setScoringRules(data || []);
    } catch (error) {
      console.error('Error fetching scoring rules:', error);
      setError('Failed to load scoring rules');
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

  const handleCreateRule = () => {
    setCurrentRule(null);
    setFormData({
      exam_id: exams.length > 0 ? exams[0].id : '',
      marks_correct: 1,
      marks_incorrect: 0,
      marks_unanswered: 0
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditRule = (rule) => {
    setCurrentRule(rule);
    setFormData({
      exam_id: rule.exam_id,
      marks_correct: rule.marks_correct,
      marks_incorrect: rule.marks_incorrect,
      marks_unanswered: rule.marks_unanswered
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this scoring rule?')) {
        return;
      }
      
      const { error } = await supabase
        .from('scoring_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
      
      // Refresh rules list
      fetchScoringRules();
    } catch (error) {
      console.error('Error deleting scoring rule:', error);
      alert('Failed to delete scoring rule');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (['marks_correct', 'marks_incorrect', 'marks_unanswered'].includes(name)) {
      const numValue = parseFloat(value);
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.exam_id) {
      errors.exam_id = 'Exam is required';
    }
    
    if (formData.marks_correct === '' || isNaN(formData.marks_correct)) {
      errors.marks_correct = 'Valid number required';
    }
    
    if (formData.marks_incorrect === '' || isNaN(formData.marks_incorrect)) {
      errors.marks_incorrect = 'Valid number required';
    }
    
    if (formData.marks_unanswered === '' || isNaN(formData.marks_unanswered)) {
      errors.marks_unanswered = 'Valid number required';
    }
    
    // Check if there's already a rule for this exam (when creating new)
    if (!currentRule && scoringRules.some(rule => rule.exam_id === formData.exam_id)) {
      errors.exam_id = 'A scoring rule already exists for this exam';
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
      if (currentRule) {
        // Update existing rule
        const { error } = await supabase
          .from('scoring_rules')
          .update({ 
            marks_correct: formData.marks_correct,
            marks_incorrect: formData.marks_incorrect,
            marks_unanswered: formData.marks_unanswered
          })
          .eq('id', currentRule.id);
        
        if (error) throw error;
      } else {
        // Create new rule
        const { error } = await supabase
          .from('scoring_rules')
          .insert({ 
            exam_id: formData.exam_id,
            marks_correct: formData.marks_correct,
            marks_incorrect: formData.marks_incorrect,
            marks_unanswered: formData.marks_unanswered
          });
        
        if (error) throw error;
      }
      
      // Close modal and refresh list
      setIsModalOpen(false);
      fetchScoringRules();
    } catch (error) {
      console.error('Error saving scoring rule:', error);
      alert('Failed to save scoring rule');
    }
  };

  const handleExamFilterChange = (e) => {
    setFilterExam(e.target.value);
    // Apply filter
    fetchScoringRules();
  };

  return (
    <Container>
      {error && <Error>{error}</Error>}
      
      <ControlsBar>
        <FilterContainer>
          <FaFilter className="filter-icon" />
          <Select 
            value={filterExam} 
            onChange={(e) => setFilterExam(e.target.value)}
            onBlur={() => fetchScoringRules()}
          >
            <option value="">All Exams</option>
            {exams.map(exam => (
              <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
            ))}
          </Select>
        </FilterContainer>
        
        <Button primary onClick={handleCreateRule}>
          <FaPlus /> Add Scoring Rule
        </Button>
      </ControlsBar>
      
      {loading ? (
        <Loading>Loading scoring rules...</Loading>
      ) : scoringRules.length === 0 ? (
        <EmptyState>
          {filterExam 
            ? "No scoring rules found for the selected exam." 
            : "No scoring rules found. Create one to get started."}
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Exam</th>
              <th>Marks (Correct)</th>
              <th>Marks (Incorrect)</th>
              <th>Marks (Unanswered)</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scoringRules.map(rule => (
              <tr key={rule.id}>
                <td>{rule.exams.exam_name}</td>
                <td>+{rule.marks_correct}</td>
                <td>{rule.marks_incorrect < 0 ? rule.marks_incorrect : `+${rule.marks_incorrect}`}</td>
                <td>{rule.marks_unanswered < 0 ? rule.marks_unanswered : `+${rule.marks_unanswered}`}</td>
                <td>{new Date(rule.created_at).toLocaleDateString()}</td>
                <td>
                  <ActionButtons>
                    <ActionButton onClick={() => handleEditRule(rule)}>
                      <FaEdit />
                    </ActionButton>
                    <ActionButton danger onClick={() => handleDeleteRule(rule.id)}>
                      <FaTrash />
                    </ActionButton>
                  </ActionButtons>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      {/* Modal for creating/editing scoring rules */}
      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>{currentRule ? 'Edit Scoring Rule' : 'Create Scoring Rule'}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="exam_id">Exam</Label>
                  <Select
                    id="exam_id"
                    name="exam_id"
                    value={formData.exam_id}
                    onChange={handleInputChange}
                    disabled={currentRule}
                    error={formErrors.exam_id}
                  >
                    <option value="">Select an Exam</option>
                    {exams.map(exam => (
                      <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
                    ))}
                  </Select>
                  {formErrors.exam_id && <ErrorText>{formErrors.exam_id}</ErrorText>}
                </FormGroup>
                
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="marks_correct">Marks for Correct Answer</Label>
                    <Input
                      id="marks_correct"
                      name="marks_correct"
                      type="number"
                      step="0.01"
                      value={formData.marks_correct}
                      onChange={handleInputChange}
                      error={formErrors.marks_correct}
                    />
                    {formErrors.marks_correct && <ErrorText>{formErrors.marks_correct}</ErrorText>}
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="marks_incorrect">Marks for Incorrect Answer</Label>
                    <Input
                      id="marks_incorrect"
                      name="marks_incorrect"
                      type="number"
                      step="0.01"
                      value={formData.marks_incorrect}
                      onChange={handleInputChange}
                      error={formErrors.marks_incorrect}
                    />
                    {formErrors.marks_incorrect && <ErrorText>{formErrors.marks_incorrect}</ErrorText>}
                  </FormGroup>
                </FormRow>
                
                <FormGroup>
                  <Label htmlFor="marks_unanswered">Marks for Unanswered Question</Label>
                  <Input
                    id="marks_unanswered"
                    name="marks_unanswered"
                    type="number"
                    step="0.01"
                    value={formData.marks_unanswered}
                    onChange={handleInputChange}
                    error={formErrors.marks_unanswered}
                  />
                  {formErrors.marks_unanswered && <ErrorText>{formErrors.marks_unanswered}</ErrorText>}
                </FormGroup>
                
                <ScoringInfo>
                  <p>
                    <strong>How scoring works:</strong> Use positive values for awarding marks and negative values for deducting marks. 
                    Typically, correct answers get positive marks (e.g., +1), incorrect answers may have negative or zero marks (e.g., -0.25 or 0), 
                    and unanswered questions usually have zero marks.
                  </p>
                </ScoringInfo>
                
                <ButtonGroup>
                  <Button type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button primary type="submit">
                    {currentRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
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
  /* Reuse the same container styles as your other components */
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  th, td {
    padding: 12px 16px;
    text-align: left;
    ${typography.textMdRegular};
  }
  
  th {
    ${typography.textMdBold};
    background-color: ${colors.backgroundSecondary};
    color: ${colors.textPrimary};
  }
  
  td {
    border-top: 1px solid #f0f0f0;
    color: ${colors.textPrimary};
  }
  
  tbody tr:hover {
    background-color: ${colors.backgroundSecondary}50;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.danger ? colors.accentError : colors.brandPrimary};
  
  &:hover {
    opacity: 0.8;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  ${typography.textMdMedium};
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

const FilterContainer = styled.div`
  position: relative;
  width: 250px;
  
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

const ErrorText = styled.p`
  ${typography.textSmMedium};
  color: ${colors.accentError};
  margin: 4px 0 0 0;
`;

const ScoringInfo = styled.div`
  margin: 16px 0;
  padding: 12px;
  background-color: ${colors.backgroundSecondary};
  border-radius: 6px;
  
  p {
    ${typography.textSmRegular};
    margin: 0;
    color: ${colors.textSecondary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

export default AdminScoringRules; 