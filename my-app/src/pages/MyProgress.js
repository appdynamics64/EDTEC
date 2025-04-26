import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import SidebarLayout from '../components/layout/SidebarLayout';
import LoadingScreen from '../components/LoadingScreen';
import { 
  FaMedal, 
  FaTrophy, 
  FaChartLine, 
  FaTable,
  FaChartBar,
  FaStar
} from 'react-icons/fa';

// Components
const LeaderboardCard = ({ user, rank, xp }) => {
  return (
    <StyledLeaderboardCard>
      <RankBadge rank={rank}>
        {rank <= 3 ? <FaMedal size={16} /> : `#${rank}`}
      </RankBadge>
      <UserInfo>
        {user.profile_photo_url ? (
          <UserAvatar src={user.profile_photo_url} alt={user.name} />
        ) : (
          <UserAvatarPlaceholder>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </UserAvatarPlaceholder>
        )}
        <UserName>{user.name}</UserName>
      </UserInfo>
      <XpValue>{xp} XP</XpValue>
    </StyledLeaderboardCard>
  );
};

const TopicProgressCard = ({ topic, masteryLevel, questionsCorrect, questionsTotal }) => {
  const percentage = questionsTotal > 0 ? (questionsCorrect / questionsTotal) * 100 : 0;
  
  // Determine mastery level text and color
  let masteryColor, masteryText;
  if (percentage >= 90) {
    masteryColor = '#10B981';
    masteryText = 'Expert';
  } else if (percentage >= 75) {
    masteryColor = '#3B82F6';
    masteryText = 'Advanced';
  } else if (percentage >= 50) {
    masteryColor = '#F59E0B';
    masteryText = 'Intermediate';
  } else {
    masteryColor = '#EF4444';
    masteryText = 'Beginner';
  }
  
  return (
    <StyledTopicCard>
      <TopicName>{topic}</TopicName>
      
      <MasteryInfo>
        <MasteryLabel>Mastery:</MasteryLabel>
        <MasteryBadge color={masteryColor}>
          <FaStar size={12} style={{ marginRight: '4px' }} />
          {masteryText}
        </MasteryBadge>
      </MasteryInfo>
      
      <ProgressContainer>
        <QuestionsInfo>
          {questionsCorrect}/{questionsTotal} correct
        </QuestionsInfo>
        <ProgressBar>
          <ProgressFill 
            width={`${percentage}%`}
            color={masteryColor}
          />
        </ProgressBar>
      </ProgressContainer>
    </StyledTopicCard>
  );
};

const TestResultCard = ({ test, score, completedAt }) => {
  const date = new Date(completedAt).toLocaleDateString();
  const scoreValue = parseFloat(score);
  
  // Determine score color based on value
  let scoreColor;
  if (scoreValue >= 80) scoreColor = '#10B981';
  else if (scoreValue >= 60) scoreColor = '#3B82F6';
  else if (scoreValue >= 40) scoreColor = '#F59E0B';
  else scoreColor = '#EF4444';
  
  return (
    <StyledTestResultCard>
      <TestInfo>
        <TestName>{test.test_name}</TestName>
        <CompletedDate>Completed on {date}</CompletedDate>
      </TestInfo>
      <ScoreContainer>
        <Score color={scoreColor}>{scoreValue.toFixed(1)}%</Score>
      </ScoreContainer>
    </StyledTestResultCard>
  );
};

const MyProgress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [topicProgress, setTopicProgress] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Load user progress data
  useEffect(() => {
    if (!user) return;
    
    const loadProgressData = async () => {
      try {
        setLoading(true);
        
        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, selected_exam_id, profile_photo_url, total_xp, weekly_xp')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setUserData({
          ...profileData,
          email: user.email
        });
        
        // Get leaderboard data (top 10)
        const { data: leaderboard, error: leaderboardError } = await supabase
          .from('profiles')
          .select('id, name, profile_photo_url, total_xp')
          .not('total_xp', 'is', null)
          .order('total_xp', { ascending: false })
          .limit(10);
          
        if (leaderboardError) throw leaderboardError;
        
        setLeaderboardData(leaderboard);
        
        // Get topic progress data (mocked for now)
        // In a real app, this would come from a topic_progress table
        setTopicProgress([
          {
            topic: 'Algebra',
            masteryLevel: 'Advanced',
            questionsCorrect: 42,
            questionsTotal: 50
          },
          {
            topic: 'Geometry',
            masteryLevel: 'Intermediate',
            questionsCorrect: 28,
            questionsTotal: 40
          },
          {
            topic: 'Calculus',
            masteryLevel: 'Beginner',
            questionsCorrect: 15,
            questionsTotal: 45
          },
          {
            topic: 'Statistics',
            masteryLevel: 'Expert',
            questionsCorrect: 38,
            questionsTotal: 40
          },
          {
            topic: 'Probability',
            masteryLevel: 'Intermediate',
            questionsCorrect: 22,
            questionsTotal: 35
          }
        ]);
        
        // Get test results
        const { data: testAttemptsData, error: testAttemptsError } = await supabase
          .from('test_attempts')
          .select(`
            id,
            test_id,
            final_score,
            created_at,
            updated_at,
            tests (
              id,
              test_name,
              number_of_questions
            )
          `)
          .eq('user_id', user.id)
          .not('final_score', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(10);
          
        if (testAttemptsError) throw testAttemptsError;
        
        setTestResults(testAttemptsData.map(attempt => ({
          id: attempt.id,
          test: attempt.tests,
          score: attempt.final_score,
          completedAt: attempt.updated_at
        })));
        
      } catch (error) {
        console.error('Error loading progress data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProgressData();
  }, [user]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <SidebarLayout>
      <PageContainer>
        <PageHeader>
          <HeaderContent>
            <PageTitle>My Progress</PageTitle>
            <UserXpInfo>
              <XpLabel>Your XP:</XpLabel> 
              <TotalXp>{userData?.total_xp || 0}</TotalXp>
              <WeeklyIndicator>
                This Week: <span>+{userData?.weekly_xp || 0}</span>
              </WeeklyIndicator>
            </UserXpInfo>
          </HeaderContent>
        </PageHeader>
        
        <TabContainer>
          <Tab 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            <FaChartLine size={16} style={{ marginRight: '8px' }} />
            Overview
          </Tab>
          <Tab 
            active={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')}
          >
            <FaTrophy size={16} style={{ marginRight: '8px' }} />
            Leaderboard
          </Tab>
          <Tab 
            active={activeTab === 'topics'} 
            onClick={() => setActiveTab('topics')}
          >
            <FaChartBar size={16} style={{ marginRight: '8px' }} />
            Topic Mastery
          </Tab>
          <Tab 
            active={activeTab === 'tests'} 
            onClick={() => setActiveTab('tests')}
          >
            <FaTable size={16} style={{ marginRight: '8px' }} />
            Test Results
          </Tab>
        </TabContainer>
        
        <ContentContainer>
          {activeTab === 'overview' && (
            <OverviewContainer>
              <SectionTitle>Progress Summary</SectionTitle>
              
              <StatsContainer>
                <StatCard>
                  <StatIcon>
                    <FaTrophy size={24} color="#F59E0B" />
                  </StatIcon>
                  <StatContent>
                    <StatValue>{userData?.total_xp || 0}</StatValue>
                    <StatLabel>Total XP</StatLabel>
                  </StatContent>
                </StatCard>
                
                <StatCard>
                  <StatIcon>
                    <FaChartLine size={24} color="#10B981" />
                  </StatIcon>
                  <StatContent>
                    <StatValue>{testResults.length}</StatValue>
                    <StatLabel>Tests Completed</StatLabel>
                  </StatContent>
                </StatCard>
                
                <StatCard>
                  <StatIcon>
                    <FaStar size={24} color="#3B82F6" />
                  </StatIcon>
                  <StatContent>
                    <StatValue>
                      {testResults.length > 0 
                        ? (testResults.reduce((sum, test) => sum + parseFloat(test.score), 0) / testResults.length).toFixed(1)
                        : '0.0'}%
                    </StatValue>
                    <StatLabel>Average Score</StatLabel>
                  </StatContent>
                </StatCard>
              </StatsContainer>
              
              <SectionDivider />
              
              <SectionTitle>Recent Test Results</SectionTitle>
              <TestResultsContainer>
                {testResults.slice(0, 3).map(result => (
                  <TestResultCard 
                    key={result.id}
                    test={result.test}
                    score={result.score}
                    completedAt={result.completedAt}
                  />
                ))}
                
                {testResults.length === 0 && (
                  <EmptyState>
                    <p>No test results yet. Complete some tests to see your results here!</p>
                  </EmptyState>
                )}
              </TestResultsContainer>
              
              <SectionDivider />
              
              <SectionTitle>Top Performers</SectionTitle>
              <LeaderboardContainer>
                {leaderboardData.slice(0, 3).map((user, index) => (
                  <LeaderboardCard 
                    key={user.id}
                    user={user}
                    rank={index + 1}
                    xp={user.total_xp}
                  />
                ))}
              </LeaderboardContainer>
            </OverviewContainer>
          )}
          
          {activeTab === 'leaderboard' && (
            <LeaderboardFullContainer>
              <SectionTitle>Global Leaderboard</SectionTitle>
              {leaderboardData.map((user, index) => (
                <LeaderboardCard 
                  key={user.id}
                  user={user}
                  rank={index + 1}
                  xp={user.total_xp}
                />
              ))}
            </LeaderboardFullContainer>
          )}
          
          {activeTab === 'topics' && (
            <TopicsContainer>
              <SectionTitle>Topic Mastery</SectionTitle>
              {topicProgress.map((topic, index) => (
                <TopicProgressCard 
                  key={index}
                  topic={topic.topic}
                  masteryLevel={topic.masteryLevel}
                  questionsCorrect={topic.questionsCorrect}
                  questionsTotal={topic.questionsTotal}
                />
              ))}
            </TopicsContainer>
          )}
          
          {activeTab === 'tests' && (
            <TestResultsFullContainer>
              <SectionTitle>Test Results</SectionTitle>
              {testResults.map(result => (
                <TestResultCard 
                  key={result.id}
                  test={result.test}
                  score={result.score}
                  completedAt={result.completedAt}
                />
              ))}
              
              {testResults.length === 0 && (
                <EmptyState>
                  <p>No test results yet. Complete some tests to see your results here!</p>
                </EmptyState>
              )}
            </TestResultsFullContainer>
          )}
        </ContentContainer>
      </PageContainer>
    </SidebarLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  background-color: #f8fafc;
  padding: 32px;
  border-bottom: 1px solid #e2e8f0;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const UserXpInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const XpLabel = styled.span`
  font-size: 0.875rem;
  color: #64748b;
`;

const TotalXp = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: #3b82f6;
`;

const WeeklyIndicator = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 4px 8px;
  border-radius: 9999px;
  margin-left: 8px;
  
  span {
    color: #10b981;
    font-weight: 600;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
  padding: 0 32px;
  overflow-x: auto;
  
  @media (max-width: 640px) {
    padding: 0 16px;
  }
`;

const Tab = styled.button`
  padding: 16px 24px;
  background: none;
  border: none;
  font-size: 0.875rem;
  font-weight: ${props => props.active ? '600' : '500'};
  color: ${props => props.active ? '#3b82f6' : '#64748b'};
  border-bottom: 2px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  
  &:hover {
    color: ${props => props.active ? '#3b82f6' : '#1e293b'};
  }
`;

const ContentContainer = styled.div`
  padding: 0 32px 32px;
  
  @media (max-width: 640px) {
    padding: 0 16px 32px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
`;

const OverviewContainer = styled.div``;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
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

const SectionDivider = styled.div`
  height: 1px;
  background-color: #e2e8f0;
  margin: 32px 0;
`;

const TestResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const LeaderboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LeaderboardFullContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopicsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const TestResultsFullContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StyledLeaderboardCard = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const RankBadge = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => {
    if (props.rank === 1) return '#FFC107';
    if (props.rank === 2) return '#9E9E9E';
    if (props.rank === 3) return '#CD7F32';
    return '#64748b';
  }};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const UserAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserAvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #64748b;
`;

const UserName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
`;

const XpValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #3b82f6;
`;

const StyledTopicCard = styled.div`
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TopicName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
`;

const MasteryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const MasteryLabel = styled.span`
  font-size: 0.875rem;
  color: #64748b;
`;

const MasteryBadge = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: ${props => `${props.color}10`};
  color: ${props => props.color};
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const ProgressContainer = styled.div``;

const QuestionsInfo = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 8px;
  text-align: right;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background-color: ${props => props.color || '#3b82f6'};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const StyledTestResultCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TestInfo = styled.div`
  flex: 1;
`;

const TestName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
`;

const CompletedDate = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const ScoreContainer = styled.div`
  padding: 8px 16px;
  background-color: #f8fafc;
  border-radius: 9999px;
`;

const Score = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.color || '#3b82f6'};
`;

const EmptyState = styled.div`
  padding: 24px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  text-align: center;
  
  p {
    color: #64748b;
    font-size: 0.875rem;
  }
`;

export default MyProgress; 