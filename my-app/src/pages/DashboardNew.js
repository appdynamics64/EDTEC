import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import SidebarLayout from '../components/layout/SidebarLayout';
import LoadingScreen from '../components/LoadingScreen';
import { 
  FaCheckCircle, 
  FaChartLine, 
  FaTrophy, 
  FaLightbulb, 
  FaRocket, 
  FaClipboardCheck, 
  FaBrain, 
  FaBook,
  FaArrowRight,
  FaGraduationCap,
  FaClock,
  FaBolt,
  FaChevronRight,
  FaArrowUp,
  FaStar
} from 'react-icons/fa';

// Reusable components
const StatCard = ({ icon: Icon, title, value, subtext, color }) => (
  <StyledStatCard borderColor={color}>
    <StatCardIconWrapper bgColor={`${color}20`}>
      <Icon size={24} color={color} />
    </StatCardIconWrapper>
    <StatCardContent>
      <StatCardValue>{value}</StatCardValue>
      <StatCardTitle>{title}</StatCardTitle>
      {subtext && <StatCardSubtext>{subtext}</StatCardSubtext>}
    </StatCardContent>
  </StyledStatCard>
);

const ActionCard = ({ icon: Icon, title, description, action, onClick }) => (
  <StyledActionCard onClick={onClick}>
    <ActionCardIconWrapper>
      <Icon size={24} />
    </ActionCardIconWrapper>
    <ActionCardContent>
      <ActionCardTitle>{title}</ActionCardTitle>
      <ActionCardDescription>{description}</ActionCardDescription>
    </ActionCardContent>
    <ActionButton>
      {action} <FaArrowRight size={12} style={{ marginLeft: '4px' }} />
    </ActionButton>
  </StyledActionCard>
);

const TestCard = ({ test, onClick }) => {
  const status = test.user_test_progress.status;
  
  return (
    <StyledTestCard 
      status={status}
      onClick={() => onClick(test.id)}
    >
      <TestCardHeader>
        <TestCardTitle>{test.test_name}</TestCardTitle>
        <TestStatusBadge status={status}>
          {status === 'completed' 
            ? 'Completed' 
            : status === 'in_progress' 
              ? 'In Progress' 
              : 'Not Started'}
        </TestStatusBadge>
      </TestCardHeader>
      
      <TestCardInfo>
        <TestCardInfoItem>
          <span>Questions:</span>
          <span>{test.number_of_questions}</span>
        </TestCardInfoItem>
        <TestCardInfoItem>
          <span>Duration:</span>
          <span>{test.test_duration} mins</span>
        </TestCardInfoItem>
        
        {status === 'completed' && (
          <TestCardInfoItem>
            <span>Score:</span>
            <span>
              {test.user_test_progress.attempt?.final_score !== 'N/A'
                ? `${Math.abs(Number(test.user_test_progress.attempt.final_score)).toFixed(2)}%`
                : 'N/A'}
            </span>
          </TestCardInfoItem>
        )}
        
        {status === 'in_progress' && (
          <TestProgressBar>
            <TestProgressFill width="35%" />
          </TestProgressBar>
        )}
      </TestCardInfo>
      
      <TestCardActionButton status={status}>
        {status === 'completed' 
          ? 'View Details' 
          : status === 'in_progress'
            ? 'Continue Test'
            : 'Start Test'}
      </TestCardActionButton>
    </StyledTestCard>
  );
};

const DashboardNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('learn');
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [userData, setUserData] = useState(null);
  const [statistics, setStatistics] = useState({
    testsCompleted: '0/0',
    averageScore: '0%',
    bestScore: '0%',
    xpGained: '0'
  });
  const [recentTests, setRecentTests] = useState([]);
  const [recommendedTests, setRecommendedTests] = useState([]);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
  const [stats, setStats] = useState({
    totalTestsTaken: 0,
    averageScore: 0,
    totalQuestionsAnswered: 0
  });

  // Load Dashboard Data
  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        console.log('DashboardNew: Starting to fetch data');
        
        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, selected_exam_id, profile_photo_url, total_xp')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData?.selected_exam_id) throw new Error('No exam selected');

        console.log('DashboardNew: Profile data loaded', profileData);
        setUserData({
          ...profileData,
          email: user.email
        });

        // Get tests and attempts
        console.log('DashboardNew: Fetching tests for exam ID:', profileData.selected_exam_id);
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select(`
            *,
            test_attempts(
              id,
              start_time,
              end_time,
              final_score,
              created_at
            )
          `)
          .eq('exam_id', profileData.selected_exam_id)
          .eq('test_attempts.user_id', user.id)
          .order('created_at', { ascending: true });

        if (testsError) {
          console.log('DashboardNew: Error fetching tests:', testsError);
          throw testsError;
        }
        
        console.log('DashboardNew: Tests data loaded', testsData);
        console.log('DashboardNew: Tests data length:', testsData?.length || 0);

        // If testsData is empty or undefined, try fetching all tests regardless of attempts
        let allTests = testsData || [];
        if (!testsData || testsData.length === 0) {
          console.log('DashboardNew: No tests with attempts found, fetching all tests');
          
          // Try to get all tests for the exam without filtering by user attempts
          const { data: allTestsData, error: allTestsError } = await supabase
            .from('tests')
            .select('*')
            .eq('exam_id', profileData.selected_exam_id)
            .order('created_at', { ascending: true });
            
          if (allTestsError) {
            console.log('DashboardNew: Error fetching all tests:', allTestsError);
          } else {
            console.log('DashboardNew: All tests data loaded', allTestsData);
            console.log('DashboardNew: All tests data length:', allTestsData?.length || 0);
            allTests = allTestsData || [];
          }
        }

        // Check if test_name field exists, if not, try to use name instead
        // This handles potential schema differences between versions
        const processedTests = allTests.map(test => {
          // Check if fields exist, use fallbacks if they don't
          const testName = test.test_name || test.name || 'Unnamed Test';
          const testDuration = test.test_duration || test.duration_minutes || 30;
          const numberOfQuestions = test.number_of_questions || test.question_count || 20;
          
          const attempts = test.test_attempts || [];
          const latestAttempt = attempts.sort((a, b) => 
            new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01')
          )[0];

          let status = 'not_started';
          if (latestAttempt) {
            if (latestAttempt.end_time) {
              status = 'completed';
            } else if (latestAttempt.start_time) {
              status = 'in_progress';
            }
          }

          return {
            ...test,
            // Ensure these fields exist for UI rendering
            test_name: testName,
            test_duration: testDuration,
            number_of_questions: numberOfQuestions,
            user_test_progress: {
              status,
              attempt: {
                ...latestAttempt,
                final_score: latestAttempt?.final_score ?? 'N/A'
              }
            }
          };
        });

        console.log('DashboardNew: Processed tests:', processedTests);
        console.log('DashboardNew: Processed tests length:', processedTests.length);
        setTests(processedTests);
        
        // Calculate statistics
        const totalTests = processedTests.length;
        const completedTests = processedTests.filter(test => 
          test.user_test_progress.status === 'completed'
        ).length;
        
        const completedTestScores = processedTests
          .filter(test => test.user_test_progress.status === 'completed')
          .map(test => Number(test.user_test_progress.attempt?.final_score) || 0);
        
        const averageScore = completedTestScores.length 
          ? (completedTestScores.reduce((a, b) => a + b, 0) / completedTestScores.length).toFixed(1)
          : 0;

        const bestScore = Math.max(...completedTestScores, 0).toFixed(1);

        setStatistics({
          testsCompleted: `${completedTests}/${totalTests}`,
          averageScore: `${averageScore}%`,
          bestScore: `${bestScore}%`,
          xpGained: profileData.total_xp || 0
        });

        // Fetch recent tests - use completed tests for real data
        const recentCompletedTests = processedTests
          .filter(test => test.user_test_progress.status === 'completed')
          .sort((a, b) => {
            const dateA = a.user_test_progress.attempt?.end_time || '';
            const dateB = b.user_test_progress.attempt?.end_time || '';
            return new Date(dateB) - new Date(dateA);
          })
          .slice(0, 3)
          .map(test => ({
            id: test.id,
            name: test.test_name,
            score: Number(test.user_test_progress.attempt?.final_score) || 0,
            date: test.user_test_progress.attempt?.end_time || '',
            questions: test.number_of_questions,
            time: test.test_duration ? `${test.test_duration} min` : 'N/A'
          }));
        
        console.log('DashboardNew: Recent completed tests:', recentCompletedTests);
        setRecentTests(recentCompletedTests);

        // Fetch recommended tests from Supabase
        // Get tests that haven't been completed yet or have lower scores
        console.log('DashboardNew: Fetching recommended tests');
        let recommendedData = [];
        
        try {
          // First attempt to get recommended tests with expected schema
          const { data: recommendedResult, error: recommendedError } = await supabase
            .from('tests')
            .select(`
              id, 
              test_name,
              difficulty,
              test_duration,
              number_of_questions,
              tags
            `)
            .eq('exam_id', profileData.selected_exam_id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (recommendedError) {
            console.log('DashboardNew: Error fetching recommended tests:', recommendedError);
            // Don't throw, continue and try alternative query
          } else if (recommendedResult && recommendedResult.length > 0) {
            recommendedData = recommendedResult;
          } else {
            // If first query returned empty, try with different field names
            console.log('DashboardNew: No recommended tests found, trying alternative query');
            const { data: alternativeResult, error: alternativeError } = await supabase
              .from('tests')
              .select('*')
              .eq('exam_id', profileData.selected_exam_id)
              .order('created_at', { ascending: false })
              .limit(3);
              
            if (alternativeError) {
              console.log('DashboardNew: Error fetching alternative tests:', alternativeError);
            } else {
              recommendedData = alternativeResult || [];
            }
          }
        } catch (error) {
          console.log('DashboardNew: Error in recommended tests fetching:', error);
          // Continue with empty recommendedData
        }
        
        console.log('DashboardNew: Recommended data:', recommendedData);
        console.log('DashboardNew: Recommended data length:', recommendedData?.length || 0);

        // If we still have no recommended tests, use the already processed tests
        if (!recommendedData || recommendedData.length === 0) {
          console.log('DashboardNew: Using processed tests as fallback for recommendations');
          recommendedData = processedTests.slice(0, 3).map(test => ({
            id: test.id,
            test_name: test.test_name,
            difficulty: test.difficulty || 'Medium',
            test_duration: test.test_duration,
            number_of_questions: test.number_of_questions,
            tags: test.tags || '["General"]'
          }));
        }

        // Process recommended tests
        const recommendedProcessed = recommendedData.map(test => {
          // Check if user has attempted this test
          const userAttempt = processedTests.find(t => t.id === test.id);
          
          // Handle potential schema differences
          const testName = test.test_name || test.name || 'Unnamed Test';
          const testDuration = test.test_duration || test.duration_minutes || 30;
          const numberOfQuestions = test.number_of_questions || test.question_count || 20;
          const testDifficulty = test.difficulty || 'Medium';
          
          // Parse tags or provide default
          let testTags = [];
          try {
            if (test.tags) {
              if (typeof test.tags === 'string') {
                testTags = JSON.parse(test.tags);
              } else if (Array.isArray(test.tags)) {
                testTags = test.tags;
              }
            }
          } catch (e) {
            console.log('DashboardNew: Error parsing tags:', e);
          }
          
          // Filter out "General" and "Medium" tags
          testTags = testTags.filter(tag => tag !== 'General' && tag !== 'Medium');
          
          // If completed with high score, it's less recommended, otherwise it's recommended
          const isHighPriority = !userAttempt || 
                               userAttempt.user_test_progress.status !== 'completed' || 
                               Number(userAttempt.user_test_progress.attempt?.final_score) < 80;

          // Only include tests that haven't been completed with high scores
          if (isHighPriority) {
            return {
              id: test.id,
              name: testName,
              difficulty: testDifficulty,
              estimatedTime: `${testDuration || 30} min`,
              questions: numberOfQuestions || 20,
              tags: testTags
            };
          }
          return null;
        }).filter(Boolean);

        // If we don't have enough recommended tests after filtering, add any remaining tests
        if (recommendedProcessed.length < 3) {
          const remainingCount = 3 - recommendedProcessed.length;
          const existingIds = recommendedProcessed.map(t => t.id);
          
          const additionalTests = processedTests
            .filter(test => !existingIds.includes(test.id))
            .slice(0, remainingCount)
            .map(test => ({
              id: test.id,
              name: test.test_name,
              difficulty: test.difficulty || 'Medium',
              estimatedTime: `${test.test_duration || 30} min`,
              questions: test.number_of_questions || 20,
              tags: test.tags ? JSON.parse(test.tags) : []
            }));
          
          recommendedProcessed.push(...additionalTests);
        }

        // Limit to 3 tests
        const limitedRecommendedTests = recommendedProcessed.slice(0, 3);
        
        console.log('DashboardNew: Final recommended tests:', limitedRecommendedTests);
        console.log('DashboardNew: Final recommended tests length:', limitedRecommendedTests.length);
        setRecommendedTests(limitedRecommendedTests);

        // Fetch streak data and stats
        // In a real implementation, these would also come from the backend
        // For now, we'll calculate simple stats based on the available data
        const now = new Date();
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        // Check if user has completed a test yesterday for streak calculation
        const hasActivityYesterday = processedTests.some(test => {
          const endTime = test.user_test_progress.attempt?.end_time;
          return endTime && endTime.includes(yesterday);
        });

        setStreakData({ 
          current: hasActivityYesterday ? 1 : 0, 
          longest: completedTests > 0 ? 7 : 0 
        });

        setStats({
          totalTestsTaken: completedTests || 0,
          averageScore: averageScore || 0,
          totalQuestionsAnswered: completedTests * 20, // Approximation
        });
        
        console.log('DashboardNew: All data loaded successfully');
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Update filtered tests when active filter changes
  useEffect(() => {
    if (!tests.length) return;
    
    switch (activeFilter) {
      case 'completed':
        setFilteredTests(tests.filter(test => test.user_test_progress.status === 'completed'));
        break;
      case 'in_progress':
        setFilteredTests(tests.filter(test => test.user_test_progress.status === 'in_progress'));
        break;
      default:
        setFilteredTests(tests);
    }
  }, [tests, activeFilter]);

  const handleTestClick = (testId) => {
    navigate(`/test-details/${testId}`);
  };

  // Suggested action handlers
  const handleStartRandomTest = () => {
    const incompleteTests = tests.filter(test => test.user_test_progress.status !== 'completed');
    if (incompleteTests.length) {
      const randomTest = incompleteTests[Math.floor(Math.random() * incompleteTests.length)];
      navigate(`/test-details/${randomTest.id}`);
    }
  };

  const handleReviewIncorrect = () => {
    navigate('/my-progress');
  };

  const handlePracticeWeakTopics = () => {
    navigate('/practice');
  };

  const handleChatWithBot = () => {
    navigate('/chatbot');
  };

  const goToTests = () => {
    navigate('/practice-tests');
  };

  const goToProgress = () => {
    navigate('/my-progress');
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6366f1';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <SidebarLayout>
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading your dashboard...</LoadingText>
        </LoadingContainer>
      </SidebarLayout>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  // Add debugging information when no tests are found
  if (!tests || tests.length === 0) {
    console.log('DashboardNew: Rendering with no tests found');
    return (
      <SidebarLayout>
        <PageContainer>
          <WelcomeSection>
            <BlurredBackground />
            <WelcomeContent>
              <WelcomeMessage>
                <h1>Welcome, {userData?.name || 'there'}!</h1>
                <p>Your personalized dashboard is ready.</p>
              </WelcomeMessage>
            </WelcomeContent>
          </WelcomeSection>
          
          <DebugSection>
            <h2>Debug Information</h2>
            <p>No tests were found for your dashboard. Here's some information that might help:</p>
            <ul>
              <li>User ID: {user?.id || 'Not available'}</li>
              <li>Selected Exam ID: {userData?.selected_exam_id || 'None'}</li>
              <li>Tests array length: {tests?.length || 0}</li>
              <li>Recommended tests length: {recommendedTests?.length || 0}</li>
            </ul>
            <button onClick={() => window.location.reload()}>Reload Page</button>
          </DebugSection>
          
          <DashboardGrid>
            <RecommendedSection>
              <SectionHeader>
                <SectionIcon background="#f59e0b">
                  <FaGraduationCap />
                </SectionIcon>
                <SectionTitle>Recommended Tests</SectionTitle>
              </SectionHeader>
              
              {recommendedTests.length === 0 ? (
                <EmptyState>
                  <p>No recommended tests available at the moment.</p>
                  <ActionButton onClick={goToTests}>Browse All Tests</ActionButton>
                </EmptyState>
              ) : (
                <RecommendedGrid>
                  {recommendedTests.map(test => (
                    <RecommendedCard key={test.id}>
                      <RecommendedHeader>
                        <RecommendedName>{test.name}</RecommendedName>
                      </RecommendedHeader>
                      
                      <RecommendedMeta>
                        <MetaGroup>
                          <MetaLabel>Time:</MetaLabel>
                          <MetaValue>{test.estimatedTime}</MetaValue>
                        </MetaGroup>
                        <MetaGroup>
                          <MetaLabel>Questions:</MetaLabel>
                          <MetaValue>{test.questions}</MetaValue>
                        </MetaGroup>
                      </RecommendedMeta>

                      {test.tags && test.tags.length > 0 && (
                        <TagContainer>
                          {test.tags.map((tag, index) => (
                            <Tag key={index}>{tag}</Tag>
                          ))}
                        </TagContainer>
                      )}
                      
                      <StartTestButton onClick={() => handleTestClick(test.id)}>
                        Start Test
                        <FaChevronRight size={12} />
                      </StartTestButton>
                    </RecommendedCard>
                  ))}
                </RecommendedGrid>
              )}
            </RecommendedSection>
          </DashboardGrid>
        </PageContainer>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <PageContainer>
        <WelcomeSection>
          <BlurredBackground />
          <WelcomeContent>
            <WelcomeMessage>
              <h1>Welcome back, {userData?.name || 'Student'}!</h1>
              <p>Continue your learning journey. Here's what's new today.</p>
            </WelcomeMessage>
            <StreakInfo>
              <StreakCard>
                <StreakIcon>
                  <FaBolt />
                </StreakIcon>
                <StreakDetails>
                  <StreakValue>{streakData.current}-Day Streak</StreakValue>
                  <StreakText>Longest: {streakData.longest} days</StreakText>
                </StreakDetails>
              </StreakCard>
            </StreakInfo>
          </WelcomeContent>
        </WelcomeSection>

        <DashboardGrid>
          <StatsSection>
            <SectionHeader>
              <SectionIcon background="#4f46e5">
                <FaChartLine />
              </SectionIcon>
              <SectionTitle>Your Stats</SectionTitle>
            </SectionHeader>

            <StatsGrid>
              <StatCardItem>
                <StatIcon background="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)">
                  <FaClipboardCheck />
                </StatIcon>
                <StatInfo>
                  <StatValue>{stats.totalTestsTaken}</StatValue>
                  <StatLabel>Tests Taken</StatLabel>
                </StatInfo>
              </StatCardItem>

              <StatCardItem>
                <StatIcon background="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)">
                  <FaTrophy />
                </StatIcon>
                <StatInfo>
                  <StatValue>{stats.averageScore}%</StatValue>
                  <StatLabel>Average Score</StatLabel>
                </StatInfo>
              </StatCardItem>

              <StatCardItem>
                <StatIcon background="linear-gradient(135deg, #10b981 0%, #34d399 100%)">
                  <FaBook />
                </StatIcon>
                <StatInfo>
                  <StatValue>{stats.totalQuestionsAnswered}</StatValue>
                  <StatLabel>Questions Answered</StatLabel>
                </StatInfo>
              </StatCardItem>
            </StatsGrid>

            <ActionButton onClick={goToProgress}>
              View Detailed Progress
              <FaChevronRight size={12} />
            </ActionButton>
          </StatsSection>

          <RecommendedSection>
            <SectionHeader>
              <SectionIcon background="#f59e0b">
                <FaGraduationCap />
              </SectionIcon>
              <SectionTitle>Recommended for You</SectionTitle>
            </SectionHeader>

            {recommendedTests.length === 0 ? (
              <EmptyState>
                <p>No recommended tests available at the moment.</p>
                <ActionButton onClick={goToTests}>Browse All Tests</ActionButton>
              </EmptyState>
            ) : (
              <RecommendedGrid>
                {recommendedTests.map(test => (
                  <RecommendedCard key={test.id}>
                    <RecommendedHeader>
                      <RecommendedName>{test.name}</RecommendedName>
                    </RecommendedHeader>
                    
                    <RecommendedMeta>
                      <MetaGroup>
                        <MetaLabel>Time:</MetaLabel>
                        <MetaValue>{test.estimatedTime}</MetaValue>
                      </MetaGroup>
                      <MetaGroup>
                        <MetaLabel>Questions:</MetaLabel>
                        <MetaValue>{test.questions}</MetaValue>
                      </MetaGroup>
                    </RecommendedMeta>

                    {test.tags && test.tags.length > 0 && (
                      <TagContainer>
                        {test.tags.map((tag, index) => (
                          <Tag key={index}>{tag}</Tag>
                        ))}
                      </TagContainer>
                    )}
                    
                    <StartTestButton onClick={() => handleTestClick(test.id)}>
                      Start Test
                      <FaChevronRight size={12} />
                    </StartTestButton>
                  </RecommendedCard>
                ))}
              </RecommendedGrid>
            )}

            <ActionButton onClick={goToTests}>
              View All Practice Tests
              <FaChevronRight size={12} />
            </ActionButton>
          </RecommendedSection>
        </DashboardGrid>
      </PageContainer>
    </SidebarLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  color: #6b7280;
  font-size: 1rem;
`;

const WelcomeSection = styled.div`
  position: relative;
  height: 180px;
  overflow: hidden;
  border-radius: 0 0 20px 20px;
  margin-bottom: 32px;
  
  @media (max-width: 768px) {
    height: 220px;
  }
`;

const BlurredBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  z-index: 0;
`;

const WelcomeContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  color: white;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
`;

const WelcomeMessage = styled.div`
  h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  p {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 1.5rem;
    }
    
    p {
      font-size: 1rem;
    }
  }
`;

const StreakInfo = styled.div`
  display: flex;
  gap: 16px;
`;

const StreakCard = styled.div`
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const StreakIcon = styled.div`
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fbbf24;
`;

const StreakDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const StreakValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
`;

const StreakText = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  padding: 0 32px 32px;
  
  @media (max-width: 768px) {
    padding: 0 16px 16px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const SectionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${props => props.background || '#4f46e5'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const StatsSection = styled.section`
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 28px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
`;

const StatCardItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.background || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background-color: #f8fafc;
  color: #4f46e5;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f1f5f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: #64748b;
  
  p {
    margin-bottom: 16px;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ScoreBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 6px 12px;
  background-color: ${props => props.color || '#4f46e5'};
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
`;

const RecommendedSection = styled.section`
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  padding: 24px;
`;

const RecommendedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const RecommendedCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const RecommendedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
`;

const RecommendedName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
`;

const DifficultyBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background-color: ${props => props.color || '#4f46e5'};
  color: white;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.75rem;
  white-space: nowrap;
`;

const RecommendedMeta = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const MetaGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MetaLabel = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const MetaValue = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const Tag = styled.div`
  padding: 4px 10px;
  background-color: #e2e8f0;
  color: #475569;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const StartTestButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
  }
`;

// Styled components for StatCard
const StyledStatCard = styled.div`
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  border-left: 4px solid ${props => props.borderColor || '#4f46e5'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const StatCardIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background-color: ${props => props.bgColor || 'rgba(79, 70, 229, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
`;

const StatCardContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatCardValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
`;

const StatCardTitle = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 2px;
`;

const StatCardSubtext = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
`;

// Styled components for ActionCard
const StyledActionCard = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ActionCardIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 16px;
`;

const ActionCardContent = styled.div`
  flex: 1;
`;

const ActionCardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const ActionCardDescription = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

// Styled components for TestCard
const StyledTestCard = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s ease;
  border-top: 4px solid ${props => 
    props.status === 'completed' ? '#10b981' : 
    props.status === 'in_progress' ? '#f59e0b' : 
    '#4f46e5'
  };
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const TestCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const TestCardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
`;

const TestStatusBadge = styled.div`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  
  background-color: ${props => 
    props.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
    props.status === 'in_progress' ? 'rgba(245, 158, 11, 0.1)' : 
    'rgba(79, 70, 229, 0.1)'
  };
  
  color: ${props => 
    props.status === 'completed' ? '#10b981' : 
    props.status === 'in_progress' ? '#f59e0b' : 
    '#4f46e5'
  };
`;

const TestCardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
`;

const TestCardInfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  
  span:first-child {
    color: #64748b;
  }
  
  span:last-child {
    color: #1e293b;
    font-weight: 500;
  }
`;

const TestProgressBar = styled.div`
  height: 6px;
  background-color: #e2e8f0;
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
`;

const TestProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
  width: ${props => props.width || '0%'};
`;

const TestCardActionButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  
  background-color: ${props => 
    props.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
    props.status === 'in_progress' ? 'rgba(245, 158, 11, 0.1)' : 
    'rgba(79, 70, 229, 0.1)'
  };
  
  color: ${props => 
    props.status === 'completed' ? '#10b981' : 
    props.status === 'in_progress' ? '#f59e0b' : 
    '#4f46e5'
  };
  
  &:hover {
    opacity: 0.8;
  }
`;

const DebugSection = styled.div`
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  
  h2 {
    color: #856404;
    margin-top: 0;
  }
  
  p {
    color: #856404;
  }
  
  ul {
    margin-bottom: 20px;
  }
  
  li {
    margin-bottom: 8px;
  }
  
  button {
    background-color: #6c757d;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      background-color: #5a6268;
    }
  }
`;

export default DashboardNew; 