import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import SidebarLayout from '../components/layout/SidebarLayout';
import LoadingScreen from '../components/LoadingScreen';
import { 
  FaTrophy, 
  FaLock, 
  FaPlayCircle, 
  FaChevronDown, 
  FaChevronUp, 
  FaInfoCircle,
  FaSearch,
  FaExternalLinkAlt,
  FaGraduationCap
} from 'react-icons/fa';

const PracticeTopics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelTests, setLevelTests] = useState([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [levelProgresses, setLevelProgresses] = useState({});
  const [subjectProgresses, setSubjectProgresses] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubjects, setFilteredSubjects] = useState([]);

  useEffect(() => {
    loadUserData();
  }, [user]);

  useEffect(() => {
    // Filter subjects based on search query
    if (!subjects.length) return;
    
    if (!searchQuery.trim()) {
      setFilteredSubjects(subjects);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = subjects.filter(subject => {
      // Match subject name
      if (subject.name.toLowerCase().includes(query)) return true;
      
      // Match topic names
      const hasMatchingTopic = subject.topics.some(topic => 
        topic.name.toLowerCase().includes(query)
      );
      
      return hasMatchingTopic;
    });
    
    setFilteredSubjects(filtered);
  }, [subjects, searchQuery]);

  useEffect(() => {
    const loadLevelProgresses = async () => {
      const newProgresses = {};
      for (const subject of subjects) {
        for (const topic of subject.topics) {
          for (const level of topic.levels) {
            const progress = await calculateLevelProgress(level.id);
            newProgresses[level.id] = progress;
          }
        }
      }
      setLevelProgresses(newProgresses);
    };

    if (subjects.length > 0) {
      loadLevelProgresses();
    }
  }, [subjects]);

  useEffect(() => {
    const calculateAllSubjectProgresses = async () => {
      const newProgresses = {};
      for (const subject of subjects) {
        let totalTests = 0;
        let completedTests = 0;

        for (const topic of subject.topics) {
          for (const level of topic.levels) {
            const progress = levelProgresses[level.id] || { completed: 0, total: 0 };
            totalTests += progress.total;
            completedTests += progress.completed;
          }
        }

        newProgresses[subject.id] = totalTests > 0 
          ? Math.round((completedTests / totalTests) * 100) 
          : 0;
      }
      setSubjectProgresses(newProgresses);
    };

    if (subjects.length > 0 && Object.keys(levelProgresses).length > 0) {
      calculateAllSubjectProgresses();
    }
  }, [subjects, levelProgresses]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // 1. Get user's selected exam
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('selected_exam_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile Error:', profileError);
        return;
      }

      if (!profileData?.selected_exam_id) {
        console.log('No exam selected');
        return;
      }

      // 2. Get exam_topics with subject and topic information
      const { data: examTopicsData, error: examTopicsError } = await supabase
        .from('exam_topics')
        .select(`
          id,
          exam_id,
          subject_id,
          topic_id,
          subjects!exam_topics_subject_id_fkey (
            id,
            subject_name
          ),
          topics!exam_topics_topic_id_fkey (
            id,
            topic_name,
            practice_levels (
              id,
              level_number,
              level_name,
              practice_tests (
                id,
                test_id,
                test_order
              )
            )
          )
        `)
        .eq('exam_id', profileData.selected_exam_id);

      if (examTopicsError) {
        console.error('Exam Topics Error:', examTopicsError);
        return;
      }

      // 3. Process the data into subjects with topics
      const subjectsMap = new Map();

      examTopicsData.forEach(examTopic => {
        if (!examTopic.subjects || !examTopic.topics) {
          console.log('Skipping examTopic due to missing data:', examTopic);
          return;
        }

        const subject = examTopic.subjects;
        const topic = examTopic.topics;
        
        if (!subjectsMap.has(subject.id)) {
          subjectsMap.set(subject.id, {
            id: subject.id,
            name: subject.subject_name,
            topics: []
          });
        }

        // Check if topic already exists in the subject
        const existingTopic = subjectsMap.get(subject.id).topics
          .find(t => t.id === topic.id);

        if (!existingTopic) {
          const levels = (topic.practice_levels || [])
            .sort((a, b) => a.level_number - b.level_number)
            .map(level => ({
              id: level.id,
              level_number: level.level_number,
              name: level.level_name,
              test_count: level.practice_tests?.length || 0
            }));

          subjectsMap.get(subject.id).topics.push({
            id: topic.id,
            name: topic.topic_name,
            levels: levels
          });
        }
      });

      const processedSubjects = Array.from(subjectsMap.values());
      setSubjects(processedSubjects);
      setFilteredSubjects(processedSubjects);

    } catch (error) {
      console.error('Error in loadUserData:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevelProgress = async (levelId) => {
    try {
      const { data: levelTests } = await supabase
        .from('practice_tests')
        .select('test_id')
        .eq('practice_level_id', levelId);

      if (!levelTests || levelTests.length === 0) {
        return { completed: 0, total: 0 };
      }

      const testIds = levelTests.map(test => test.test_id);

      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('test_id')
        .eq('user_id', user.id)
        .in('test_id', testIds)
        .not('final_score', 'is', null);

      // Count unique completed tests
      const uniqueCompletedTests = new Set(attempts?.map(a => a.test_id) || []);

      return {
        completed: uniqueCompletedTests.size,
        total: levelTests.length
      };
    } catch (error) {
      console.error('Error calculating level progress:', error);
      return { completed: 0, total: 0 };
    }
  };

  const isLevelLocked = (topic, levelNumber) => {
    if (levelNumber === 1) return false;
    const previousLevel = topic.levels.find(l => l.level_number === levelNumber - 1);
    if (!previousLevel) return true;
    
    const previousProgress = levelProgresses[previousLevel.id] || { completed: 0, total: 0 };
    return previousProgress.completed === 0;
  };

  const loadLevelTests = async (levelId, topic) => {
    try {
      // First get all tests for this level
      const { data: testsData, error: testsError } = await supabase
        .from('practice_tests')
        .select(`
          id,
          test_order,
          test_id,
          tests (
            id,
            test_name,
            number_of_questions,
            test_duration
          )
        `)
        .eq('practice_level_id', levelId)
        .order('test_order');

      if (testsError) throw testsError;

      // Get latest attempt for each test
      const testIds = testsData.map(test => test.test_id);
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('test_id, final_score, created_at')
        .eq('user_id', user.id)
        .in('test_id', testIds)
        .not('final_score', 'is', null)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Get only the latest attempt for each test
      const latestAttempts = new Map();
      attemptsData?.forEach(attempt => {
        if (!latestAttempts.has(attempt.test_id)) {
          latestAttempts.set(attempt.test_id, attempt.final_score);
        }
      });

      const processedTests = testsData.map(pt => ({
        id: pt.id,
        test_id: pt.test_id,
        order: pt.test_order,
        name: pt.tests.test_name,
        questions: pt.tests.number_of_questions,
        duration: pt.tests.test_duration,
        completed: latestAttempts.has(pt.test_id),
        score: latestAttempts.get(pt.test_id)
      }));

      setLevelTests(processedTests);
      setSelectedLevel(levelId);
      setSelectedTopic(topic);
      setShowTestModal(true);
    } catch (error) {
      console.error('Error loading level tests:', error);
    }
  };

  const toggleSubject = (subjectId) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const getLevelState = (topic, level) => {
    const progress = levelProgresses[level.id] || { completed: 0, total: 0 };
    
    if (progress.completed === level.test_count && level.test_count > 0) {
      return 'completed';
    } else if (progress.completed > 0) {
      return 'ongoing';
    } else if (isLevelLocked(topic, level.level_number)) {
      return 'locked';
    }
    return 'available';
  };

  const handleStartTest = (test) => {
    setShowTestModal(false);
    navigate(`/test/${test.test_id}`);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SidebarLayout>
      <PageContainer>
        <PageHeader>
          <HeaderContent>
            <PageTitle>Practice by Topic</PageTitle>
            <PageDescription>
              Master subjects and topics through progressive levels of practice tests
            </PageDescription>
          </HeaderContent>
        </PageHeader>

        <SearchBarContainer>
          <SearchIconWrapper>
            <FaSearch size={16} color="#9CA3AF" />
          </SearchIconWrapper>
          <SearchInput 
            type="text" 
            placeholder="Search subjects or topics..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBarContainer>

        <SubjectsGrid>
          {filteredSubjects.map(subject => (
            <SubjectCard key={subject.id}>
              <SubjectHeader onClick={() => toggleSubject(subject.id)}>
                <SubjectTitleRow>
                  <SubjectIcon>
                    <FaGraduationCap size={20} />
                  </SubjectIcon>
                  <SubjectTitle>{subject.name}</SubjectTitle>
                </SubjectTitleRow>
                
                <SubjectActions>
                  <ProgressIndicator>
                    <ProgressLabel>{subjectProgresses[subject.id] || 0}% Complete</ProgressLabel>
                    <ProgressBar>
                      <ProgressFill width={`${subjectProgresses[subject.id] || 0}%`} />
                    </ProgressBar>
                  </ProgressIndicator>
                  
                  <ToggleIcon>
                    {expandedSubjects.has(subject.id) ? 
                      <FaChevronUp color="#64748b" /> : 
                      <FaChevronDown color="#64748b" />
                    }
                  </ToggleIcon>
                </SubjectActions>
              </SubjectHeader>

              {expandedSubjects.has(subject.id) && (
                <TopicsContainer>
                  {subject.topics.map(topic => (
                    <TopicCard key={topic.id}>
                      <TopicHeader>
                        <TopicTitle>{topic.name}</TopicTitle>
                        <TopicInfo>
                          <FaInfoCircle size={12} />
                          <span>{topic.levels.length} Levels</span>
                        </TopicInfo>
                      </TopicHeader>
                      
                      <LevelsContainer>
                        {topic.levels.map(level => {
                          const levelState = getLevelState(topic, level);
                          const progress = levelProgresses[level.id] || { completed: 0, total: 0 };
                          const progressPercentage = level.test_count > 0 
                            ? Math.round((progress.completed / level.test_count) * 100) 
                            : 0;
                          
                          return (
                            <LevelCard 
                              key={level.id}
                              state={levelState}
                              onClick={() => levelState !== 'locked' && loadLevelTests(level.id, {
                                name: topic.name,
                                subject_name: subject.name
                              })}
                            >
                              <LevelHeader>
                                <LevelTitle>Level {level.level_number}</LevelTitle>
                                {levelState === 'locked' && <FaLock size={14} />}
                                {levelState === 'completed' && <FaTrophy size={14} color="#10b981" />}
                              </LevelHeader>
                              
                              <LevelProgress>
                                <LevelProgressLabel>
                                  {progress.completed}/{level.test_count} Tests
                                </LevelProgressLabel>
                                <LevelProgressBar>
                                  <LevelProgressFill 
                                    width={`${progressPercentage}%`}
                                    state={levelState}
                                  />
                                </LevelProgressBar>
                              </LevelProgress>
                              
                              <LevelAction state={levelState}>
                                {levelState === 'locked' ? 'Locked' : 
                                 levelState === 'completed' ? 'Review' :
                                 levelState === 'ongoing' ? 'Continue' : 'Start'}
                                
                                {levelState !== 'locked' && (
                                  <FaPlayCircle size={12} style={{ marginLeft: '6px' }} />
                                )}
                              </LevelAction>
                            </LevelCard>
                          );
                        })}
                      </LevelsContainer>
                    </TopicCard>
                  ))}
                </TopicsContainer>
              )}
            </SubjectCard>
          ))}

          {filteredSubjects.length === 0 && (
            <EmptyState>
              <EmptyStateTitle>No subjects found</EmptyStateTitle>
              <EmptyStateText>
                {searchQuery 
                  ? 'Try adjusting your search query' 
                  : 'No practice topics are available for your selected exam'}
              </EmptyStateText>
            </EmptyState>
          )}
        </SubjectsGrid>
      </PageContainer>

      {showTestModal && (
        <ModalOverlay onClick={() => setShowTestModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Practice Tests</ModalTitle>
              <ModalSubtitle>
                {selectedTopic?.subject_name} → {selectedTopic?.name}
              </ModalSubtitle>
            </ModalHeader>
            
            <TestsList>
              {levelTests.map((test, index) => {
                const isLocked = index > 0 && !levelTests[index - 1].completed;
                
                return (
                  <TestItem key={test.id} locked={isLocked}>
                    <TestDetails>
                      <TestOrder>Test {index + 1}</TestOrder>
                      <TestName>{test.name}</TestName>
                      <TestMeta>
                        <TestMetaItem>{test.questions} Questions</TestMetaItem>
                        <TestMetaItem>{test.duration} mins</TestMetaItem>
                      </TestMeta>
                      
                      {test.completed && (
                        <TestScore score={test.score}>
                          Score: {Number(test.score).toFixed(0)}%
                        </TestScore>
                      )}
                    </TestDetails>
                    
                    <TestButton 
                      completed={test.completed}
                      locked={isLocked}
                      onClick={() => !isLocked && handleStartTest(test)}
                      disabled={isLocked}
                    >
                      {test.completed ? 'Retake Test' : 'Start Test'}
                      {!isLocked && <FaExternalLinkAlt size={12} style={{ marginLeft: '8px' }} />}
                      {isLocked && <FaLock size={12} style={{ marginLeft: '8px' }} />}
                    </TestButton>
                  </TestItem>
                );
              })}
              
              {levelTests.length === 0 && (
                <EmptyTests>
                  <EmptyTestsTitle>No tests available</EmptyTestsTitle>
                  <EmptyTestsText>There are no tests available for this level yet.</EmptyTestsText>
                </EmptyTests>
              )}
            </TestsList>
            
            <ModalFooter>
              <LevelCompletionProgress>
                <span>Level Progress:</span>
                <ModalProgressBar>
                  <ModalProgressFill 
                    width={`${levelTests.length > 0 ? (levelTests.filter(t => t.completed).length / levelTests.length) * 100 : 0}%`}
                  />
                </ModalProgressBar>
                <ProgressText>
                  {levelTests.filter(t => t.completed).length} of {levelTests.length} completed
                </ProgressText>
              </LevelCompletionProgress>
              
              <CloseButton onClick={() => setShowTestModal(false)}>
                Close
              </CloseButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </SidebarLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 0 48px 0;
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

const PageDescription = styled.p`
  font-size: 1rem;
  color: #64748b;
  max-width: 800px;
`;

const SearchBarContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto 32px;
  padding: 0 24px;
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 36px;
  transform: translateY(-50%);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);
  }
`;

const SubjectsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 24px;
`;

const SubjectCard = styled.div`
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const SubjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f9fafb;
  }
`;

const SubjectTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const SubjectIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #3b82f6, #2563eb);
  border-radius: 8px;
  color: white;
`;

const SubjectTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const SubjectActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ProgressIndicator = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 180px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ProgressLabel = styled.span`
  font-size: 0.85rem;
  color: #64748b;
  text-align: right;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background-color: #3b82f6;
  border-radius: 3px;
`;

const ToggleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: #f8fafc;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e5e7eb;
  }
`;

const TopicsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 0 24px 24px;
  background-color: #fafafa;
  border-top: 1px solid #f1f5f9;
`;

const TopicCard = styled.div`
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
`;

const TopicHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TopicTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
`;

const TopicInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #64748b;
`;

const LevelsContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LevelCard = styled.div`
  border: 1px solid ${props => {
    if (props.state === 'completed') return '#10b981';
    if (props.state === 'ongoing') return '#3b82f6';
    if (props.state === 'locked') return '#cbd5e1';
    return '#e5e7eb';
  }};
  background-color: ${props => {
    if (props.state === 'completed') return '#ecfdf5';
    if (props.state === 'ongoing') return '#eff6ff';
    if (props.state === 'locked') return '#f8fafc';
    return 'white';
  }};
  border-radius: 8px;
  padding: 14px;
  cursor: ${props => props.state === 'locked' ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  
  &:hover {
    transform: ${props => props.state === 'locked' ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.state === 'locked' ? 'none' : '0 4px 6px rgba(0, 0, 0, 0.05)'};
  }
`;

const LevelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const LevelTitle = styled.h4`
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
`;

const LevelProgress = styled.div`
  margin-bottom: 12px;
`;

const LevelProgressLabel = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 6px;
`;

const LevelProgressBar = styled.div`
  width: 100%;
  height: 5px;
  background-color: #f1f5f9;
  border-radius: 2.5px;
  overflow: hidden;
`;

const LevelProgressFill = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background-color: ${props => {
    if (props.state === 'completed') return '#10b981';
    if (props.state === 'ongoing') return '#3b82f6';
    return '#cbd5e1';
  }};
  border-radius: 2.5px;
`;

const LevelAction = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => {
    if (props.state === 'completed') return '#059669';
    if (props.state === 'ongoing') return '#2563eb';
    if (props.state === 'locked') return '#94a3b8';
    return '#3b82f6';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  background-color: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

const EmptyStateText = styled.p`
  font-size: 0.95rem;
  color: #64748b;
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 24px;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const ModalSubtitle = styled.div`
  font-size: 0.95rem;
  color: #64748b;
`;

const TestsList = styled.div`
  padding: 16px 24px;
  flex: 1;
  overflow-y: auto;
  max-height: 50vh;
  
  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f8fafc;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f8fafc;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 4px;
  }
`;

const TestItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: ${props => props.locked ? '#f8fafc' : 'white'};
  border: 1px solid ${props => props.locked ? '#e2e8f0' : '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 12px;
  opacity: ${props => props.locked ? 0.7 : 1};
`;

const TestDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const TestOrder = styled.div`
  font-size: 0.8rem;
  color: #64748b;
`;

const TestName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
`;

const TestMeta = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 2px;
`;

const TestMetaItem = styled.div`
  font-size: 0.85rem;
  color: #64748b;
`;

const TestScore = styled.div`
  margin-top: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => {
    if (props.score >= 80) return '#10b981';
    if (props.score >= 60) return '#f59e0b';
    return '#ef4444';
  }};
`;

const TestButton = styled.button`
  padding: 10px 16px;
  background-color: ${props => {
    if (props.locked) return '#94a3b8';
    if (props.completed) return '#10b981';
    return '#3b82f6';
  }};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: ${props => props.locked ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: ${props => {
      if (props.locked) return '#94a3b8';
      if (props.completed) return '#059669';
      return '#2563eb';
    }};
    transform: ${props => props.locked ? 'none' : 'translateY(-1px)'};
  }
`;

const EmptyTests = styled.div`
  text-align: center;
  padding: 32px 24px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
`;

const EmptyTestsTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

const EmptyTestsText = styled.p`
  font-size: 0.9rem;
  color: #64748b;
`;

const ModalFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8fafc;
`;

const LevelCompletionProgress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: #64748b;
  width: 60%;
`;

const ModalProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
`;

const ModalProgressFill = styled.div`
  height: 100%;
  width: ${props => props.width || '0%'};
  background-color: #3b82f6;
  border-radius: 3px;
`;

const ProgressText = styled.span`
  font-size: 0.85rem;
  color: #64748b;
`;

const CloseButton = styled.button`
  padding: 10px 20px;
  background-color: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e2e8f0;
  }
`;

export default PracticeTopics; 