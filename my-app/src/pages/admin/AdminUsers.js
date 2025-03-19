import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaEdit, FaTrash, FaUserShield } from 'react-icons/fa';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'user',
    selected_exam_id: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchExams();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Query to get all user profiles with their selected exam
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          role,
          profile_photo_url,
          selected_exam_id,
          created_at,
          exams (
            id,
            exam_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Also get test attempt counts
      const usersWithCounts = await Promise.all((data || []).map(async (user) => {
        const { count, error: countError } = await supabase
          .from('test_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (countError) throw countError;
        
        return {
          ...user,
          attemptCount: count || 0
        };
      }));

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
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
      // Don't set error state here to avoid blocking user display
    }
  };

  const handleEditUser = (user) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      role: user.role || 'user',
      selected_exam_id: user.selected_exam_id || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update local state to reflect the change
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = {};
    if (!formData.name) {
      errors.name = 'Name is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          role: formData.role,
          selected_exam_id: formData.selected_exam_id || null,
          updated_at: new Date()
        })
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      // Close modal and refresh list
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <RoleBadge admin>Admin</RoleBadge>;
      case 'teacher':
        return <RoleBadge teacher>Teacher</RoleBadge>;
      default:
        return <RoleBadge>User</RoleBadge>;
    }
  };

  return (
    <Container>
      <Header>
        <h2>User Management</h2>
      </Header>

      {loading ? (
        <Loading>Loading users...</Loading>
      ) : error ? (
        <Error>{error}</Error>
      ) : (
        <>
          <UserStats>
            <StatCard>
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </StatCard>
            <StatCard>
              <h3>Admins</h3>
              <p>{users.filter(user => user.role === 'admin').length}</p>
            </StatCard>
          </UserStats>

          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Selected Exam</th>
                  <th>Test Attempts</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <UserInfo>
                          {user.profile_photo_url && (
                            <UserAvatar src={user.profile_photo_url} alt={user.name} />
                          )}
                          <span>{user.name}</span>
                        </UserInfo>
                      </td>
                      <td>{renderRoleBadge(user.role)}</td>
                      <td>{user.exams?.exam_name || 'None'}</td>
                      <td>{user.attemptCount}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="actions">
                        <ActionButton onClick={() => handleEditUser(user)}>
                          <FaEdit /> Edit
                        </ActionButton>
                        <RoleMenu>
                          <RoleButton>
                            <FaUserShield /> Role
                          </RoleButton>
                          <RoleDropdown>
                            <RoleItem 
                              active={user.role === 'user'}
                              onClick={() => handleEditRole(user.id, 'user')}
                            >
                              User
                            </RoleItem>
                            <RoleItem 
                              active={user.role === 'teacher'}
                              onClick={() => handleEditRole(user.id, 'teacher')}
                            >
                              Teacher
                            </RoleItem>
                            <RoleItem 
                              active={user.role === 'admin'}
                              onClick={() => handleEditRole(user.id, 'admin')}
                            >
                              Admin
                            </RoleItem>
                          </RoleDropdown>
                        </RoleMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* User Edit Modal */}
      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <h2>Edit User: {currentUser.name}</h2>
              <CloseButton onClick={() => setIsModalOpen(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={!!formErrors.name}
                  />
                  {formErrors.name && (
                    <ErrorText>{formErrors.name}</ErrorText>
                  )}
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="user">User</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="selected_exam_id">Selected Exam</Label>
                  <Select
                    id="selected_exam_id"
                    name="selected_exam_id"
                    value={formData.selected_exam_id}
                    onChange={handleInputChange}
                  >
                    <option value="">None</option>
                    {exams.map(exam => (
                      <option key={exam.id} value={exam.id}>
                        {exam.exam_name}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <ButtonGroup>
                  <ActionButton type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton type="submit" primary>
                    Update User
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

// Styled components (existing ones plus new ones for user management)
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h2 {
    ${typography.textXlBold};
    margin: 0;
  }
`;

const UserStats = styled.div`
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
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  ${typography.textSmMedium};
  background-color: ${props => {
    if (props.admin) return colors.accentSuccess || '#4caf50';
    if (props.teacher) return colors.accentInfo || '#2196f3';
    return colors.backgroundSecondary;
  }};
  color: ${props => {
    if (props.admin || props.teacher) return 'white';
    return colors.textPrimary;
  }};
`;

const RoleMenu = styled.div`
  position: relative;
  display: inline-block;
`;

const RoleButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  ${typography.textSmMedium};
  cursor: pointer;
  background-color: ${colors.backgroundSecondary};
  color: ${colors.textPrimary};
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    opacity: 0.9;
  }
`;

const RoleDropdown = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  z-index: 10;
  display: none;
  overflow: hidden;
  
  ${RoleMenu}:hover & {
    display: block;
  }
`;

const RoleItem = styled.div`
  padding: 8px 16px;
  cursor: pointer;
  ${typography.textSmMedium};
  background-color: ${props => props.active ? colors.backgroundSecondary : 'transparent'};
  
  &:hover {
    background-color: ${colors.backgroundSecondary};
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

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid ${colors.borderPrimary};
  ${typography.textMd};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const ErrorText = styled.p`
  ${typography.textSmMedium};
  color: ${colors.accentError};
  margin: 4px 0 0 0;
`;

export default AdminUsers; 