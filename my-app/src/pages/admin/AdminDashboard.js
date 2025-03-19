import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { supabase } from '../../config/supabaseClient';
import colors from '../../styles/foundation/colors';
import typography from '../../styles/foundation/typography';
import { FaUsers, FaClipboardList, FaBook, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    userCount: 0,
    testCount: 0,
    examCount: 0,
    attemptCount: 0,
    subjectCount: 0,
    questionCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all counts in parallel
      const [
        { count: userCount, error: userError },
        { count: testCount, error: testError },
        { count: examCount, error: examError },
        { count: attemptCount, error: attemptError },
        { count: subjectCount, error: subjectError },
        { count: questionCount, error: questionError }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tests').select('*', { count: 'exact', head: true }),
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('test_attempts').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true })
      ]);
      
      // Check for errors
      if (userError) throw userError;
      if (testError) throw testError;
      if (examError) throw examError;
      if (attemptError) throw attemptError;
      if (subjectError) throw subjectError;
      if (questionError) throw questionError;
      
      setStats({
        userCount,
        testCount,
        examCount,
        attemptCount,
        subjectCount,
        questionCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Get recent test attempts with user info - using only columns we know exist
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          id,
          created_at,
          test_id,
          user_id,
          profiles(name, profile_photo_url),
          tests(test_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (attemptsError) throw attemptsError;
      
      // Get recent user registrations
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, profile_photo_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (usersError) throw usersError;
      
      // Combine and sort activities - simplified to avoid missing columns
      const activities = [
        ...(attempts || []).map(attempt => {
          return {
            id: `attempt-${attempt.id}`,
            type: 'attempt',
            timestamp: attempt.created_at,
            user: attempt.profiles,
            data: {
              testName: attempt.tests?.test_name || 'Unknown Test'
            }
          };
        }),
        ...(users || []).map(user => ({
          id: `user-${user.id}`,
          type: 'registration',
          timestamp: user.created_at,
          user: {
            name: user.name,
            profile_photo_url: user.profile_photo_url
          },
          data: {}
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Don't set error state for activity failures - just show empty state
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <FaSpinner className="spinner" size={32} />
        <span>Loading dashboard data...</span>
      </LoadingContainer>
    );
  }

  if (error) {
    return <ErrorContainer>{error}</ErrorContainer>;
  }

  return (
    <Container>
      <OverviewSection>
        <SectionTitle>Overview</SectionTitle>
        <StatsGrid>
          <StatCard delay="0.1s">
            <StatIcon $color="#4285F4">
              <FaUsers />
            </StatIcon>
            <StatContent>
              <StatValue>{stats.userCount}</StatValue>
              <StatLabel>Users</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard delay="0.2s">
            <StatIcon $color="#EA4335">
              <FaClipboardList />
            </StatIcon>
            <StatContent>
              <StatValue>{stats.testCount}</StatValue>
              <StatLabel>Tests</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard delay="0.3s">
            <StatIcon $color="#FBBC05">
              <FaBook />
            </StatIcon>
            <StatContent>
              <StatValue>{stats.examCount}</StatValue>
              <StatLabel>Exams</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard delay="0.4s">
            <StatIcon $color="#34A853">
              <FaCheckCircle />
            </StatIcon>
            <StatContent>
              <StatValue>{stats.attemptCount}</StatValue>
              <StatLabel>Test Attempts</StatLabel>
            </StatContent>
          </StatCard>
        </StatsGrid>
      </OverviewSection>

      <ActivitySection>
        <SectionHeader>
          <SectionTitle>Recent Activity</SectionTitle>
        </SectionHeader>
        
        <ActivityList>
          {recentActivity.length === 0 ? (
            <EmptyState>No recent activity found</EmptyState>
          ) : (
            recentActivity.map((activity, index) => (
              <ActivityItem 
                key={activity.id}
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <UserAvatar url={activity.user?.profile_photo_url}>
                  {!activity.user?.profile_photo_url && activity.user?.name ? activity.user.name.charAt(0).toUpperCase() : '?'}
                </UserAvatar>
                <ActivityContent>
                  <ActivityText>
                    {activity.type === 'attempt' ? (
                      <>
                        <UserName>{activity.user?.name || 'Anonymous'}</UserName> completed 
                        <strong> {activity.data.testName}</strong>
                      </>
                    ) : (
                      <>
                        <UserName>{activity.user?.name || 'Anonymous'}</UserName> joined the platform
                      </>
                    )}
                  </ActivityText>
                  <TimeStamp>{formatTimestamp(activity.timestamp)}</TimeStamp>
                </ActivityContent>
              </ActivityItem>
            ))
          )}
        </ActivityList>
      </ActivitySection>
    </Container>
  );
};

// Helper function to format timestamps
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Styled components with improved design
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
`;

const OverviewSection = styled.div`
  animation: ${fadeIn} 0.5s ease forwards;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  margin-top: 16px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  padding: 24px;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  opacity: 0;
  animation: ${fadeIn} 0.5s ease forwards;
  animation-delay: ${props => props.delay || '0s'};
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background-color: ${props => `${props.$color}15`};
  color: ${props => props.$color};
  font-size: 24px;
  margin-right: 20px;
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  ${typography.displaySm};
  color: ${colors.textPrimary};
  font-weight: 600;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  ${typography.textXlBold};
  color: ${colors.textPrimary};
  margin: 0 0 12px 0;
`;

const ActivitySection = styled.div`
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  animation: ${fadeIn} 0.5s ease forwards;
  animation-delay: 0.3s;
  opacity: 0;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background-color: #f9fafb;
  transition: background-color 0.2s;
  animation: ${slideIn} 0.5s ease forwards;
  opacity: 0;
  
  &:hover {
    background-color: #f1f3f5;
  }
`;

const UserAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${props => props.url ? 'transparent' : colors.brandPrimary};
  background-image: ${props => props.url ? `url(${props.url})` : 'none'};
  background-size: cover;
  background-position: center;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  margin-right: 16px;
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityText = styled.div`
  ${typography.textMdRegular};
  color: ${colors.textPrimary};
  margin-bottom: 4px;
`;

const UserName = styled.span`
  font-weight: 600;
  color: ${colors.brandPrimary};
`;

const ScoreBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  ${typography.textSmMedium};
  background-color: ${props => {
    if (props.score >= 80) return '#34A853';
    if (props.score >= 60) return '#FBBC05';
    return '#EA4335';
  }};
  color: white;
  margin-left: 6px;
`;

const TimeStamp = styled.div`
  ${typography.textSmRegular};
  color: ${colors.textTertiary};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  color: ${colors.textSecondary};
  ${typography.textLgMedium};
  
  .spinner {
    animation: ${spin} 1.5s linear infinite;
    margin-bottom: 16px;
    color: ${colors.brandPrimary};
  }
`;

const ErrorContainer = styled.div`
  background-color: #FEF2F2;
  border: 1px solid #FEE2E2;
  border-radius: 16px;
  padding: 24px;
  color: #B91C1C;
  ${typography.textMdMedium};
  text-align: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  ${typography.textMdMedium};
  color: ${colors.textSecondary};
  background-color: #f9fafb;
  border-radius: 12px;
`;

export default AdminDashboard; 