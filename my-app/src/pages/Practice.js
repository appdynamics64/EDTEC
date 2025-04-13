import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import { FaTrophy, FaLock, FaPlayCircle, FaChevronDown, FaChevronUp, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const Practice = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [topicsWithLevels, setTopicsWithLevels] = useState({});
  const [userProgress, setUserProgress] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelTests, setLevelTests] = useState([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [levelProgresses, setLevelProgresses] = useState({});
  const [subjectProgresses, setSubjectProgresses] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, [user]);

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
            const progress = await calculateLevelProgress(level.id);
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

    if (subjects.length > 0) {
      calculateAllSubjectProgresses();
    }
  }, [subjects]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // 1. Get user's selected exam
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('selected_exam_id')
        .eq('id', user.id)
        .single();

      console.log('User ID:', user.id);
      console.log('Profile Data:', profileData);

      if (profileError) {
        console.error('Profile Error:', profileError);
        return;
      }

      if (!profileData?.selected_exam_id) {
        console.log('No exam selected');
        return;
      }

      console.log('Selected Exam ID:', profileData.selected_exam_id);

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

      console.log('Raw Exam Topics Data:', examTopicsData);

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
      console.log('Processed Subjects:', processedSubjects);
      setSubjects(processedSubjects);

      // 4. Get user progress for all levels
      const allLevelIds = processedSubjects.flatMap(subject =>
        subject.topics.flatMap(topic =>
          topic.levels.map(level => level.id)
        )
      );

      if (allLevelIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_practice_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('practice_level_id', allLevelIds);

        if (progressError) throw progressError;

        const progressByLevel = (progressData || []).reduce((acc, curr) => {
          if (!acc[curr.practice_level_id]) {
            acc[curr.practice_level_id] = [];
          }
          acc[curr.practice_level_id].push(curr);
          return acc;
        }, {});

        setUserProgress(progressByLevel);
      }

    } catch (error) {
      console.error('Error in loadUserData:', error.message);
      console.error('Error details:', error);
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

  // Add new function to load level tests
  const loadLevelTests = async (levelId) => {
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
      attemptsData.forEach(attempt => {
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
      setShowTestModal(true);
    } catch (error) {
      console.error('Error loading level tests:', error);
    }
  };

  // Add this function to toggle subject expansion
  const toggleSubject = (subjectId) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
    setSelectedSubject(subjectId);
  };

  // Add this helper function to determine level state
  const getLevelState = (topic, level) => {
    const progress = levelProgresses[level.id] || { completed: 0, total: 0 };
    
    if (progress.completed === level.test_count) {
      return 'completed';
    } else if (progress.completed > 0) {
      return 'ongoing';
    } else if (isLevelLocked(topic, level.level_number)) {
      return 'locked';
    }
    return 'available';
  };

  // Update the renderTopic function with enhanced visuals
  const renderTopic = (topic) => {
    return (
      <div key={topic.id} style={styles.topicCard}>
        <div style={styles.topicHeader}>
          <h3 style={styles.topicTitle}>{topic.name}</h3>
        </div>
        <div style={styles.levelProgress}>
          {topic.levels.map((level) => {
            const levelState = getLevelState(topic, level);
            const progress = levelProgresses[level.id] || { completed: 0, total: 0 };
            const progressPercentage = Math.round((progress.completed / level.test_count) * 100);
            
            return (
              <div
                key={level.id}
                onClick={() => levelState !== 'locked' && loadLevelTests(level.id)}
                style={{
                  ...styles.levelIndicator,
                  ...styles[`${levelState}Level`]
                }}
                title={
                  levelState === 'locked' 
                    ? `Complete Level ${level.level_number - 1} to unlock` 
                    : levelState === 'completed'
                    ? `Level ${level.level_number} - Completed`
                    : `Level ${level.level_number} - ${progress.completed}/${level.test_count} completed`
                }
              >
                <div style={styles.levelContent}>
                  <span style={styles.levelNumber}>Level {level.level_number}</span>
                  
                  {levelState === 'locked' ? (
                    <>
                      <FaLock style={styles.lockIcon} />
                      <span style={styles.lockedText}>
                        0/{level.test_count} Tests
                      </span>
                    </>
                  ) : levelState === 'completed' ? (
                    <>
                      <div style={styles.completedInfo}>
                        <FaTrophy style={styles.trophyIcon} />
                        <span style={styles.completedText}>
                          {level.test_count}/{level.test_count} Tests
                        </span>
                      </div>
                      <span style={styles.viewResults}>View Results</span>
                    </>
                  ) : (
                    <>
                      <div style={styles.progressInfo}>
                        <span style={styles.testCount}>
                          {progress.completed}/{level.test_count} Tests
                        </span>
                        <div style={styles.progressBar}>
                          <div 
                            style={{
                              ...styles.progressFill,
                              width: `${progressPercentage}%`,
                              backgroundColor: levelState === 'ongoing' ? '#3b82f6' : '#e5e7eb'
                            }}
                          />
                        </div>
                      </div>
                      <span style={styles.continueText}>
                        {progress.completed > 0 ? 'Continue' : 'Start'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Update the TestModal component to show scores
  const TestModal = () => {
    const currentLevel = levelTests[0]?.level_number;
    const currentTopic = selectedTopic;
    
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Practice Tests</h2>
            <div style={styles.breadcrumbs}>
              {currentTopic?.subject_name} → {currentTopic?.name} → Level {currentLevel}
            </div>
          </div>
          
          <div style={styles.testList}>
            {levelTests.map((test, index) => {
              const isLocked = index > 0 && !levelTests[index - 1].completed;
              
              return (
                <div key={test.id} style={{
                  ...styles.testItem,
                  ...(isLocked ? styles.lockedTestItem : {})
                }}>
                  <div style={styles.testInfo}>
                    <div style={styles.testHeader}>
                      <span style={styles.testOrder}>Test {test.order}</span>
                      {test.completed && (
                        <span style={styles.completedBadge}>
                          Completed - Score: {test.score}
                        </span>
                      )}
                      {isLocked && <FaLock style={styles.testLockIcon} />}
                    </div>
                    <span style={styles.testName}>{test.name}</span>
                    <div style={styles.testDetails}>
                      <span>{test.questions} Questions</span>
                      <span>{test.duration} mins</span>
                    </div>
                  </div>
                  <button 
                    style={{
                      ...styles.testButton,
                      ...(test.completed ? styles.completedButton : {}),
                      ...(isLocked ? styles.lockedButton : {})
                    }}
                    onClick={() => !isLocked && handleStartTest(test)}
                    disabled={isLocked}
                  >
                    {test.completed ? 'Retake Test' : 'Start Test'}
                  </button>
                </div>
              );
            })}
          </div>
          
          <div style={styles.modalFooter}>
            <div style={styles.levelProgress}>
              <span>Level Progress:</span>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${(levelTests.filter(t => t.completed).length / levelTests.length) * 100}%`
                  }}
                />
              </div>
            </div>
            <button 
              style={styles.closeButton}
              onClick={() => setShowTestModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add helper functions for progress calculation
  const calculateTopicProgress = (topic) => {
    const totalTests = topic.levels.reduce((sum, level) => sum + level.test_count, 0);
    const completedTests = topic.levels.reduce((sum, level) => 
      sum + (calculateLevelProgress(level.id).completed || 0), 0
    );
    
    return {
      total: totalTests,
      completed: completedTests,
      percentage: totalTests > 0 ? (completedTests / totalTests) * 100 : 0
    };
  };

  // Add this function to handle starting a test
  const handleStartTest = (test) => {
    setShowTestModal(false);
    navigate(`/test/${test.test_id}`);
  };

  // Add this function to calculate subject progress
  const calculateSubjectProgress = async (subject) => {
    let totalTests = 0;
    let completedTests = 0;

    for (const topic of subject.topics) {
      for (const level of topic.levels) {
        const progress = await calculateLevelProgress(level.id);
        totalTests += progress.total;
        completedTests += progress.completed;
      }
    }

    return totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
  };

  if (loading) return <LoadingScreen />;

  // Debug section
  console.log('Current State:', {
    subjects,
    userProgress
  });

  return (
    <div style={styles.container}>
      <div style={styles.navContainer}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={styles.backButton}
        >
          <FaArrowLeft style={styles.backIcon} />
          Back to Dashboard
        </button>
      </div>
      <h1 style={styles.mainTitle}>Practice by Subject</h1>
      
      <div style={styles.subjectsContainer}>
        {subjects.map(subject => (
          <div key={subject.id} style={styles.subjectCard}>
            <div 
              style={styles.subjectHeader}
              onClick={() => toggleSubject(subject.id)}
            >
              <div style={styles.subjectTitleContainer}>
                <h2 style={styles.subjectTitle}>
                  {subject.name}
                </h2>
              </div>
              <div style={styles.rightContainer}>
                <div style={styles.subjectProgress}>
                  {subjectProgresses[subject.id] || 0}% Complete
                </div>
                {expandedSubjects.has(subject.id) ? (
                  <FaChevronUp style={styles.chevronIcon} />
                ) : (
                  <FaChevronDown style={styles.chevronIcon} />
                )}
              </div>
            </div>
            
            {expandedSubjects.has(subject.id) && (
              <div style={styles.topicsContainer}>
                {subject.topics.map(renderTopic)}
              </div>
            )}
          </div>
        ))}
      </div>

      {showTestModal && <TestModal />}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  mainTitle: {
    fontSize: '2.5rem',
    color: '#1a1a1a',
    marginBottom: '40px',
    textAlign: 'center',
  },
  subjectsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  subjectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s ease',
    borderRadius: '8px',
    '&:hover': {
      backgroundColor: '#f8fafc',
    },
  },
  subjectTitleContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  subjectTitle: {
    fontSize: '1.5rem',
    color: '#1a1a1a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  rightContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  subjectProgress: {
    fontSize: '0.9rem',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
  },
  topicsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '24px',
    backgroundColor: '#ffffff',
    animation: 'slideDown 0.3s ease-out',
  },
  topicCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
  },
  topicHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  topicTitle: {
    fontSize: '1.2rem',
    color: '#334155',
    marginBottom: '16px',
  },
  progressIndicator: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '200px',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.8rem',
    color: '#6b7280',
    textAlign: 'right',
  },
  levelProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
    padding: '8px 0',
  },
  levelIndicator: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    position: 'relative',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  },
  completedLevel: {
    backgroundColor: '#d1fae5',
    border: '2px solid #059669',
    color: '#065f46',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  ongoingLevel: {
    backgroundColor: '#dbeafe',
    border: '2px solid #3b82f6',
    color: '#1e40af',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  lockedLevel: {
    backgroundColor: '#f3f4f6',
    border: '2px solid #d1d5db',
    color: '#6b7280',
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  levelContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '4px',
  },
  progressInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: '80%',
  },
  trophyIcon: {
    fontSize: '1.5rem',
    color: '#fbbf24',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
  },
  completedText: {
    fontSize: '0.9rem',
    color: '#059669',
  },
  viewResults: {
    fontSize: '0.8rem',
    color: '#059669',
    textDecoration: 'underline',
    marginTop: '4px',
  },
  lockedText: {
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  lockIcon: {
    fontSize: '1.2rem',
    marginBottom: '4px',
  },
  continueText: {
    fontSize: '0.8rem',
    color: '#3b82f6',
    fontWeight: '500',
  },
  testCount: {
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalHeader: {
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '1.5rem',
    marginBottom: '20px',
    color: '#1a1a1a',
  },
  breadcrumbs: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginTop: '4px',
  },
  testList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  testItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  testInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  testHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  testOrder: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  testName: {
    fontSize: '1.1rem',
    fontWeight: '500',
    color: '#1a1a1a',
  },
  testDetails: {
    display: 'flex',
    gap: '12px',
    fontSize: '0.9rem',
    color: '#64748b',
  },
  testButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
  },
  completedButton: {
    backgroundColor: '#10b981',
    '&:hover': {
      backgroundColor: '#059669',
    },
  },
  completedBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
  },
  testLockIcon: {
    fontSize: '0.9rem',
    color: '#9ca3af',
  },
  lockedTestItem: {
    opacity: 0.7,
    backgroundColor: '#f3f4f6',
  },
  lockedButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  closeButton: {
    marginTop: '20px',
    padding: '8px 16px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    '&:hover': {
      backgroundColor: '#475569',
    },
  },
  chevronIcon: {
    fontSize: '1.2rem',
    color: '#4b5563',
    transition: 'transform 0.3s ease',
    marginLeft: '8px',
  },
  navContainer: {
    width: '100%',
    marginBottom: '24px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#e5e7eb',
      color: '#1f2937',
    },
  },
  backIcon: {
    fontSize: '1rem',
  },
};

// Add animation keyframes
const keyframes = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Add the keyframes to the document
const style = document.createElement('style');
style.textContent = keyframes;
document.head.appendChild(style);

export default Practice; 