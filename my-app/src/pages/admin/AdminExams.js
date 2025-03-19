import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaCog } from 'react-icons/fa';

const AdminExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [formData, setFormData] = useState({ exam_name: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      
      // Fetch exams with counts
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select(`
          id,
          exam_name,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (examsError) throw examsError;
      
      // Get additional counts for each exam
      const examsWithCounts = await Promise.all(examsData.map(async (exam) => {
        // Count tests for this exam
        const { count: testCount, error: testError } = await supabase
          .from('tests')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);
        
        if (testError) throw testError;
        
        // Count users who selected this exam
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('selected_exam_id', exam.id);
        
        if (userError) throw userError;
        
        // Check if scoring rules exist for this exam
        const { data: scoringRules, error: scoringError } = await supabase
          .from('scoring_rules')
          .select('id')
          .eq('exam_id', exam.id)
          .maybeSingle();
        
        if (scoringError) throw scoringError;
        
        return {
          ...exam,
          testCount: testCount || 0,
          userCount: userCount || 0,
          hasScoringRules: !!scoringRules
        };
      }));

      setExams(examsWithCounts);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = () => {
    setCurrentExam(null);
    setFormData({ exam_name: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditExam = (exam) => {
    setCurrentExam(exam);
    setFormData({ exam_name: exam.exam_name });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam? This will also delete all related tests and data.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);
      
      if (error) throw error;
      
      // Refresh the list
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam. Make sure there are no tests or users associated with it.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = {};
    if (!formData.exam_name) {
      errors.exam_name = 'Exam name is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      if (currentExam) {
        // Update existing exam
        const { error } = await supabase
          .from('exams')
          .update({
            exam_name: formData.exam_name,
            updated_at: new Date()
          })
          .eq('id', currentExam.id);
        
        if (error) throw error;
      } else {
        // Create new exam
        const { error } = await supabase
          .from('exams')
          .insert({
            exam_name: formData.exam_name
          });
        
        if (error) throw error;
      }
      
      // Close modal and refresh list
      setIsModalOpen(false);
      fetchExams();
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Failed to save exam');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  return (
    <Container>
      <Header>
        <h2>Exam Management</h2>
        <ActionButton primary onClick={handleCreateExam}>
          Create New Exam
        </ActionButton>
      </Header>

      {loading ? (
        <Loading>Loading exams...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : (
        <>
          <ExamStats>
            <StatCard>
              <h3>Total Exams</h3>
              <p>{exams.length}</p>
            </StatCard>
          </ExamStats>

          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Tests</th>
                  <th>Users</th>
                  <th>Scoring Rules</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.length > 0 ? (
                  exams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.exam_name}</td>
                      <td>{exam.testCount}</td>
                      <td>{exam.userCount}</td>
                      <td>{exam.hasScoringRules ? 'Yes' : 'No'}</td>
                      <td>{new Date(exam.created_at).toLocaleDateString()}</td>
                      <td className="actions">
                        <ActionButton onClick={() => handleEditExam(exam)}>
                          <FaEdit /> Edit
                        </ActionButton>
                        <ActionButton 
                          danger 
                          onClick={() => handleDeleteExam(exam.id)}
                          disabled={exam.testCount > 0 || exam.userCount > 0}
                        >
                          <FaTrash /> Delete
                        </ActionButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      No exams found. Create your first exam!
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Exam Create/Edit Modal */}
      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>{currentExam ? 'Edit Exam' : 'Create New Exam'}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="exam_name">Exam Name</Label>
                  <Input
                    type="text"
                    id="exam_name"
                    name="exam_name"
                    value={formData.exam_name}
                    onChange={handleInputChange}
                    error={!!formErrors.exam_name}
                  />
                  {formErrors.exam_name && (
                    <ErrorText>{formErrors.exam_name}</ErrorText>
                  )}
                </FormGroup>
                <ButtonGroup>
                  <ActionButton type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton type="submit" primary>
                    {currentExam ? 'Update Exam' : 'Create Exam'}
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
  margin-bottom: 8px;
  
  h2 {
    ${typography.textXlBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const ExamStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  h3 {
    ${typography.textMdMedium};
    color: ${colors.textSecondary};
    margin: 0 0 8px 0;
  }
  
  p {
    ${typography.textXlBold};
    color: ${colors.textPrimary};
    margin: 0;
  }
`;

const TableContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
  cursor: pointer;
  background-color: ${props => props.primary ? colors.brandPrimary : colors.backgroundSecondary};
  color: ${props => props.primary ? 'white' : colors.textPrimary};
  border: none;
  
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

// New styled components for the modal
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

export default AdminExams; 