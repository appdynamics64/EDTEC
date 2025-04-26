import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import SidebarLayout from '../components/layout/SidebarLayout';
import LoadingScreen from '../components/LoadingScreen';
import { 
  FaSearch, 
  FaSortAmountDown, 
  FaFilter, 
  FaLock, 
  FaExternalLinkAlt,
  FaSort
} from 'react-icons/fa';

// Status Badge Component
const StatusBadge = ({ status }) => {
  let bgColor, textColor, label;
  
  switch (status) {
    case 'completed':
      bgColor = '#D1FAE5';
      textColor = '#10B981';
      label = 'Completed';
      break;
    case 'in_progress':
      bgColor = '#FEF3C7';
      textColor = '#F59E0B';
      label = 'In Progress';
      break;
    default:
      bgColor = '#F3F4F6';
      textColor = '#6B7280';
      label = 'Not Started';
  }
  
  return (
    <Badge bgColor={bgColor} textColor={textColor}>
      {label}
    </Badge>
  );
};

// Test Card Component
const TestCard = ({ test, onClick }) => {
  const status = test.user_test_progress.status;
  const isLocked = test.isLocked;
  
  return (
    <StyledTestCard 
      status={status}
      isLocked={isLocked}
      onClick={() => !isLocked && onClick(test.id)}
    >
      {isLocked && (
        <LockedOverlay>
          <FaLock size={20} />
          <span>Complete previous tests to unlock</span>
        </LockedOverlay>
      )}
      
      <TestCardHeader>
        <TestTypeTag>{test.test_type || 'Practice'}</TestTypeTag>
        <StatusBadge status={status} />
      </TestCardHeader>
      
      <TestCardTitle>{test.test_name}</TestCardTitle>
      
      <TestCardInfo>
        <TestCardInfoItem>
          <InfoLabel>Questions</InfoLabel>
          <InfoValue>{test.number_of_questions}</InfoValue>
        </TestCardInfoItem>
        
        <TestCardInfoItem>
          <InfoLabel>Duration</InfoLabel>
          <InfoValue>{test.test_duration} mins</InfoValue>
        </TestCardInfoItem>
        
        {status === 'completed' && (
          <TestCardInfoItem>
            <InfoLabel>Score</InfoLabel>
            <InfoValue className="score">
              {test.user_test_progress.attempt?.final_score !== 'N/A'
                ? `${Math.abs(Number(test.user_test_progress.attempt.final_score)).toFixed(2)}%`
                : 'N/A'}
            </InfoValue>
          </TestCardInfoItem>
        )}
        
        {status === 'in_progress' && (
          <TestProgressContainer>
            <ProgressLabel>Progress</ProgressLabel>
            <ProgressBar>
              <ProgressFill width="35%" />
            </ProgressBar>
          </TestProgressContainer>
        )}
      </TestCardInfo>
      
      <TestCardFooter>
        <TestButton 
          status={status}
          isLocked={isLocked}
          disabled={isLocked}
        >
          {status === 'completed' 
            ? 'View Details' 
            : status === 'in_progress'
              ? 'Continue Test'
              : 'Start Test'}
              
          <FaExternalLinkAlt size={12} style={{ marginLeft: '8px' }} />
        </TestButton>
      </TestCardFooter>
    </StyledTestCard>
  );
};

const PracticeTests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);

  // Load Test Data
  useEffect(() => {
    if (!user) return;
    
    const loadTestData = async () => {
      try {
        setLoading(true);
        
        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, selected_exam_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData?.selected_exam_id) throw new Error('No exam selected');

        setUserData({
          ...profileData,
          email: user.email
        });

        // Get selected exam details
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', profileData.selected_exam_id)
          .single();

        if (examError) throw examError;
        setSelectedExam(examData);

        // Get tests with their attempts and final scores
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select(`*`)
          .eq('exam_id', profileData.selected_exam_id);

        if (testsError) throw testsError;

        // Get user's test attempts separately
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id);
          
        if (attemptsError) throw attemptsError;
        
        // Map attempts to their tests
        const attemptsByTestId = {};
        attemptsData?.forEach(attempt => {
          if (!attemptsByTestId[attempt.test_id]) {
            attemptsByTestId[attempt.test_id] = [];
          }
          attemptsByTestId[attempt.test_id].push(attempt);
        });

        // Process tests with their attempt status and score
        const processedTests = testsData.map((test, index) => {
          const attempts = attemptsByTestId[test.id] || [];
          const latestAttempt = attempts.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          )[0];

          let status = 'not_started';
          if (latestAttempt) {
            if (latestAttempt.end_time) {
              status = 'completed';
            } else if (latestAttempt.start_time) {
              status = 'in_progress';
            }
          }

          // Add locked status for sequential tests
          // A test is locked if:
          // 1. It's not the first test
          // 2. Sequential access is required
          // 3. The previous test is not completed
          const isLocked = index > 0 && 
                           examData.requires_sequential_progress &&
                           (() => {
                             const prevTestId = testsData[index - 1]?.id;
                             if (!prevTestId) return false;
                             
                             const prevTestAttempts = attemptsByTestId[prevTestId] || [];
                             return !prevTestAttempts.some(a => a.end_time);
                           })();

          return {
            ...test,
            status,
            score: latestAttempt?.final_score || null,
            lastAttemptDate: latestAttempt?.created_at || null,
            attemptCount: attempts.length,
            isLocked,
            user_test_progress: {
              status,
              attempt: {
                ...latestAttempt,
                final_score: latestAttempt?.final_score ?? 'N/A'
              }
            }
          };
        }) || [];

        // Add tests to state
        console.log('Loaded tests:', processedTests);
        setTests(processedTests);
        setFilteredTests(processedTests);
        setLoading(false);
        
      } catch (error) {
        console.error('Error loading test data:', error);
      }
    };

    loadTestData();
  }, [user]);

  // Apply filters, search, and sorting
  useEffect(() => {
    if (!tests.length) return;
    
    // First apply status filter
    let filtered = [...tests];
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(test => test.user_test_progress.status === activeFilter);
    }
    
    // Then apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(test => 
        test.test_name.toLowerCase().includes(query)
      );
    }
    
    // Finally sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.test_name.localeCompare(b.test_name);
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        default:
          return a.test_order - b.test_order;
      }
    });
    
    setFilteredTests(filtered);
  }, [tests, activeFilter, searchQuery, sortOption]);

  const handleTestClick = (testId) => {
    navigate(`/test/${testId}`);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SidebarLayout>
      <PageContainer>
        <PageHeader>
          <HeaderContent>
            <PageTitle>Practice Tests</PageTitle>
            <ExamInfo>
              Current Exam: <ExamName>{selectedExam?.exam_name || 'None Selected'}</ExamName>
            </ExamInfo>
          </HeaderContent>
        </PageHeader>
        
        <ControlsContainer>
          <SearchBarContainer>
            <SearchIconWrapper>
              <FaSearch size={16} color="#9CA3AF" />
            </SearchIconWrapper>
            <SearchInput 
              type="text" 
              placeholder="Search tests..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBarContainer>
          
          <ControlsRight>
            <SortContainer>
              <SortIcon>
                <FaSort size={16} />
              </SortIcon>
              <SortSelect 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="order">Default Order</option>
                <option value="name">Name (A-Z)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </SortSelect>
            </SortContainer>
            
            <FilterToggle onClick={() => setShowFilters(!showFilters)}>
              <FaFilter size={16} />
              <span>Filter</span>
            </FilterToggle>
          </ControlsRight>
        </ControlsContainer>
        
        {showFilters && (
          <FiltersContainer>
            <FilterOption 
              active={activeFilter === 'all'} 
              onClick={() => setActiveFilter('all')}
            >
              All Tests
            </FilterOption>
            <FilterOption 
              active={activeFilter === 'completed'} 
              onClick={() => setActiveFilter('completed')}
            >
              Completed
            </FilterOption>
            <FilterOption 
              active={activeFilter === 'in_progress'} 
              onClick={() => setActiveFilter('in_progress')}
            >
              In Progress
            </FilterOption>
            <FilterOption 
              active={activeFilter === 'not_started'} 
              onClick={() => setActiveFilter('not_started')}
            >
              Not Started
            </FilterOption>
          </FiltersContainer>
        )}
        
        <TestsContainer>
          {filteredTests.length > 0 ? (
            filteredTests.map((test) => (
              <TestCard 
                key={test.id} 
                test={test} 
                onClick={handleTestClick}
              />
            ))
          ) : (
            <EmptyState>
              <EmptyStateTitle>No tests found</EmptyStateTitle>
              <EmptyStateText>
                {searchQuery 
                  ? 'Try adjusting your search or filters' 
                  : 'There are no tests matching the selected filter'}
              </EmptyStateText>
            </EmptyState>
          )}
        </TestsContainer>
      </PageContainer>
    </SidebarLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  padding: 0;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  background-color: #f8fafc;
  padding: 32px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const ExamInfo = styled.div`
  font-size: 1rem;
  color: #64748b;
`;

const ExamName = styled.span`
  font-weight: 500;
  color: #3b82f6;
`;

const ControlsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 32px;
  gap: 16px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchBarContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const ControlsRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const SortContainer = styled.div`
  position: relative;
  min-width: 160px;
`;

const SortIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6B7280;
`;

const SortSelect = styled.select`
  width: 100%;
  appearance: none;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: white;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f9fafb;
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 0 32px;
  flex-wrap: wrap;
`;

const FilterOption = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#6B7280'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#e5e7eb'};
  border-radius: 9999px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.active ? '#2563eb' : '#f9fafb'};
  }
`;

const TestsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding: 0 32px 32px;
`;

const StyledTestCard = styled.div`
  position: relative;
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  cursor: ${props => props.isLocked ? 'not-allowed' : 'pointer'};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-top: 4px solid ${props => 
    props.isLocked ? '#9CA3AF' :
    props.status === 'completed' ? '#10B981' :
    props.status === 'in_progress' ? '#F59E0B' : '#3B82F6'
  };
  filter: ${props => props.isLocked ? 'grayscale(0.5)' : 'none'};
  opacity: ${props => props.isLocked ? 0.8 : 1};
  
  &:hover {
    transform: ${props => props.isLocked ? 'none' : 'translateY(-4px)'};
    box-shadow: ${props => props.isLocked ? '0 1px 3px rgba(0, 0, 0, 0.1)' : '0 4px 12px rgba(0, 0, 0, 0.1)'};
  }
`;

const LockedOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  
  span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #4B5563;
    text-align: center;
    max-width: 80%;
  }
`;

const TestCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
`;

const TestTypeTag = styled.span`
  padding: 4px 8px;
  background-color: #eff6ff;
  color: #3b82f6;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const Badge = styled.span`
  padding: 4px 8px;
  background-color: ${props => props.bgColor || '#f3f4f6'};
  color: ${props => props.textColor || '#6b7280'};
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const TestCardTitle = styled.h3`
  margin: 0;
  padding: 0 16px;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
  margin-bottom: 16px;
`;

const TestCardInfo = styled.div`
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const TestCardInfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .score {
    font-weight: 600;
    color: #10b981;
  }
`;

const InfoLabel = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const InfoValue = styled.span`
  font-size: 0.875rem;
  color: #1e293b;
`;

const TestProgressContainer = styled.div`
  margin-top: 4px;
`;

const ProgressLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 4px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background-color: #f59e0b;
  border-radius: 3px;
`;

const TestCardFooter = styled.div`
  padding: 16px;
  border-top: 1px solid #f3f4f6;
  margin-top: 16px;
`;

const TestButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background-color: ${props => 
    props.isLocked ? '#9ca3af' :
    props.status === 'completed' ? '#4b5563' :
    props.status === 'in_progress' ? '#f59e0b' : '#3b82f6'
  };
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${props => props.isLocked ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => 
      props.isLocked ? '#9ca3af' :
      props.status === 'completed' ? '#374151' :
      props.status === 'in_progress' ? '#d97706' : '#2563eb'
    };
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px 24px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

const EmptyStateText = styled.p`
  font-size: 0.875rem;
  color: #64748b;
`;

export default PracticeTests; 