import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import SidebarLayout from '../components/layout/SidebarLayout';
import LoadingScreen from '../components/LoadingScreen';
import { 
  FaEnvelope, 
  FaCalendarAlt, 
  FaGraduationCap, 
  FaMedal,
  FaEdit,
  FaCamera,
  FaCrown,
  FaChartLine
} from 'react-icons/fa';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: ''
  });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load user data
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setUserData(profileData);
        setFormData({
          name: profileData?.name || '',
          displayName: profileData?.display_name || ''
        });
        setAvatarUrl(profileData?.profile_photo_url || null);

        // Get exam details if there's a selected exam
        if (profileData?.selected_exam_id) {
          const { data: examData, error: examError } = await supabase
            .from('exams')
            .select('*')
            .eq('id', profileData.selected_exam_id)
            .single();

          if (examError) throw examError;
          setSelectedExam(examData);
        }
        
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      setSaving(true);
      
      const updates = {
        name: formData.name.trim(),
        display_name: formData.displayName.trim() || null,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUserData(prev => ({
        ...prev,
        ...updates
      }));
      
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current user data
    setFormData({
      name: userData?.name || '',
      displayName: userData?.display_name || ''
    });
    setEditMode(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(part => part[0]?.toUpperCase()).join('').substr(0, 2);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SidebarLayout>
      <PageContainer>
        <PageBackground>
          <BlurredBackground />
          <HeaderContent>
            <PageTitle>My Profile</PageTitle>
            <HeaderSubtitle>Manage your account information and preferences</HeaderSubtitle>
          </HeaderContent>
        </PageBackground>
        
        <ContentArea>
          <ProfileGrid>
            <ProfileSection>
              <ProfileCard>
                <ProfileHeader>
                  <AvatarContainer>
                    <Avatar url={avatarUrl}>
                      {!avatarUrl && getInitials(userData?.name)}
                      <ChangeAvatarOverlay>
                        <FaCamera size={18} />
                        <span>Change</span>
                      </ChangeAvatarOverlay>
                    </Avatar>
                    {userData?.total_xp > 500 && (
                      <AchievementBadge>
                        <FaCrown size={12} />
                      </AchievementBadge>
                    )}
                  </AvatarContainer>
                  
                  <ProfileInfo>
                    {editMode ? (
                      <EditForm>
                        <FormField>
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Your full name"
                          />
                        </FormField>
                        <FormField>
                          <Label htmlFor="displayName">Display Name (optional)</Label>
                          <Input 
                            id="displayName"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleInputChange}
                            placeholder="How you want to be called"
                          />
                        </FormField>
                        <ButtonGroup>
                          <Button secondary onClick={handleCancel} disabled={saving}>
                            Cancel
                          </Button>
                          <Button primary onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </ButtonGroup>
                      </EditForm>
                    ) : (
                      <>
                        <ProfileName>{userData?.name}</ProfileName>
                        {userData?.display_name && (
                          <DisplayName>"{userData.display_name}"</DisplayName>
                        )}
                        <StatusBadge>
                          {userData?.total_xp > 1000 ? 'Expert' : 
                           userData?.total_xp > 500 ? 'Advanced' : 
                           userData?.total_xp > 200 ? 'Intermediate' : 'Beginner'}
                        </StatusBadge>
                        <EditButton onClick={() => setEditMode(true)}>
                          <FaEdit size={14} /> Edit Profile
                        </EditButton>
                      </>
                    )}
                  </ProfileInfo>
                </ProfileHeader>
              </ProfileCard>
              
              <DetailCards>
                <DetailCard>
                  <CardTitle>Account Information</CardTitle>
                  <DetailItem>
                    <DetailIcon>
                      <FaEnvelope />
                    </DetailIcon>
                    <DetailContent>
                      <DetailLabel>Email</DetailLabel>
                      <DetailValue>{user?.email}</DetailValue>
                    </DetailContent>
                  </DetailItem>
                  <DetailItem>
                    <DetailIcon>
                      <FaCalendarAlt />
                    </DetailIcon>
                    <DetailContent>
                      <DetailLabel>Joined</DetailLabel>
                      <DetailValue>
                        {userData?.created_at ? formatDate(userData.created_at) : 'N/A'}
                      </DetailValue>
                    </DetailContent>
                  </DetailItem>
                </DetailCard>
                
                <DetailCard>
                  <CardTitle>Education</CardTitle>
                  <DetailItem>
                    <DetailIcon className="education">
                      <FaGraduationCap />
                    </DetailIcon>
                    <DetailContent>
                      <DetailLabel>Selected Exam</DetailLabel>
                      <DetailValue>{selectedExam?.name || 'None selected'}</DetailValue>
                    </DetailContent>
                  </DetailItem>
                </DetailCard>
              </DetailCards>
            </ProfileSection>
            
            <StatsSection>
              <StatsCard>
                <CardTitle>Statistics</CardTitle>
                <StatsGrid>
                  <StatItem>
                    <StatIconWrapper className="xp">
                      <FaMedal size={20} />
                    </StatIconWrapper>
                    <StatContent>
                      <StatValue>{userData?.total_xp || 0}</StatValue>
                      <StatLabel>XP Points</StatLabel>
                    </StatContent>
                  </StatItem>
                  
                  <StatItem>
                    <StatIconWrapper className="progress">
                      <FaChartLine size={20} />
                    </StatIconWrapper>
                    <StatContent>
                      <StatValue>5</StatValue>
                      <StatLabel>Tests Completed</StatLabel>
                    </StatContent>
                  </StatItem>
                </StatsGrid>
                
                <ProgressSection>
                  <ProgressTitle>Next Achievement</ProgressTitle>
                  <ProgressBar>
                    <ProgressFill width={`${Math.min((userData?.total_xp || 0)/10, 100)}%`} />
                  </ProgressBar>
                  <ProgressInfo>
                    <ProgressText>{userData?.total_xp || 0}/1000 XP</ProgressText>
                    <ProgressTarget>Expert Level</ProgressTarget>
                  </ProgressInfo>
                </ProgressSection>
              </StatsCard>
              
              <PreferencesCard>
                <CardTitle>Theme Preferences</CardTitle>
                <ThemeOptions>
                  <ThemeOption active={true}>
                    <ThemeCircle className="light" />
                    <ThemeLabel>Light</ThemeLabel>
                  </ThemeOption>
                  <ThemeOption>
                    <ThemeCircle className="dark" />
                    <ThemeLabel>Dark</ThemeLabel>
                  </ThemeOption>
                  <ThemeOption>
                    <ThemeCircle className="system" />
                    <ThemeLabel>System</ThemeLabel>
                  </ThemeOption>
                </ThemeOptions>
              </PreferencesCard>
            </StatsSection>
          </ProfileGrid>
        </ContentArea>
      </PageContainer>
    </SidebarLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const PageBackground = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 0 0 20px 20px;
  
  @media (max-width: 768px) {
    height: 160px;
  }
`;

const BlurredBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%);
  z-index: 0;
`;

const HeaderContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 50px 32px;
  color: white;
  
  @media (max-width: 768px) {
    padding: 32px;
  }
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeaderSubtitle = styled.p`
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
  max-width: 600px;
`;

const ContentArea = styled.div`
  padding: 32px;
  margin-top: -60px;
  position: relative;
  z-index: 2;
  
  @media (max-width: 768px) {
    padding: 16px;
    margin-top: -40px;
  }
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ProfileCard = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  padding: 32px;
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const AvatarContainer = styled.div`
  position: relative;
  margin-right: 32px;
  
  @media (max-width: 640px) {
    margin-right: 0;
    margin-bottom: 24px;
  }
`;

const Avatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: ${props => props.url ? 'transparent' : '#3b82f6'};
  background-image: ${props => props.url ? `url(${props.url})` : 'none'};
  background-size: cover;
  background-position: center;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 600;
  position: relative;
  flex-shrink: 0;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  
  &:hover > div {
    opacity: 1;
  }
`;

const AchievementBadge = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const ChangeAvatarOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
  cursor: pointer;
  
  span {
    font-size: 0.75rem;
    margin-top: 4px;
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
`;

const ProfileName = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
`;

const DisplayName = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  font-style: italic;
  margin: 0 0 12px 0;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 16px;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
`;

const EditButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
  
  &:hover {
    background-color: #f1f5f9;
    color: #334155;
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const DetailCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const DetailCard = styled.div`
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
`;

const DetailItem = styled.div`
  display: flex;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 16px;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
  
  &.education {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    box-shadow: 0 4px 8px rgba(139, 92, 246, 0.2);
  }
`;

const DetailContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const DetailLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-size: 1rem;
  color: #1e293b;
  font-weight: 500;
`;

const EditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1e293b;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button`
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  background-color: ${props => 
    props.primary ? '#3b82f6' : 
    props.secondary ? 'white' : '#f1f5f9'};
  
  color: ${props => 
    props.primary ? 'white' : 
    props.secondary ? '#64748b' : '#334155'};
  
  border: 1px solid ${props => 
    props.primary ? '#3b82f6' : 
    props.secondary ? '#e2e8f0' : '#f1f5f9'};
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    background-color: ${props => 
      props.primary ? '#2563eb' : 
      props.secondary ? '#f8fafc' : '#e2e8f0'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StatsCard = styled.div`
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
  
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 12px;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const StatIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.xp {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(245, 158, 11, 0.2);
  }
  
  &.progress {
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
  }
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const ProgressSection = styled.div`
  margin-top: 10px;
`;

const ProgressTitle = styled.div`
  font-size: 1rem;
  color: #1e293b;
  font-weight: 500;
  margin-bottom: 12px;
`;

const ProgressBar = styled.div`
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background: linear-gradient(90deg, #3b82f6 0%, #2dd4bf 100%);
  border-radius: 4px;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProgressText = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const ProgressTarget = styled.div`
  font-size: 0.875rem;
  color: #3b82f6;
  font-weight: 500;
`;

const PreferencesCard = styled.div`
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const ThemeOptions = styled.div`
  display: flex;
  gap: 20px;
`;

const ThemeOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  ${props => props.active && `
    position: relative;
    &:after {
      content: '';
      position: absolute;
      bottom: -8px;
      width: 20px;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6 0%, #2dd4bf 100%);
      border-radius: 2px;
    }
  `}
`;

const ThemeCircle = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &.light {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border: 2px solid #e2e8f0;
  }
  
  &.dark {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #334155;
  }
  
  &.system {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    position: relative;
    overflow: hidden;
    border: 2px solid #e2e8f0;
    
    &:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 50%;
      height: 100%;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }
  }
  
  ${ThemeOption}:hover & {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ThemeLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

export default Profile; 