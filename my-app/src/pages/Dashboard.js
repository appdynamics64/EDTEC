import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import ProfileModal from '../components/ProfileModal';
import CreateTestModal from '../components/CreateTestModal';
import ReactDOM from 'react-dom';
import { fetchAvailableExams, updateUserExam } from '../services/ExamService';
import { mediaQuery } from '../utils/styleUtils';
import '../styles/Dashboard.css';
import '../styles/components.css';

// Time-based icon component
const TimeIcon = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return <span role="img" aria-label="morning">🌅</span>;
  } else if (hour >= 12 && hour < 18) {
    return <span role="img" aria-label="afternoon">☀️</span>;
  } else {
    return <span role="img" aria-label="evening">🌙</span>;
  }
};

const DashboardBanner = ({ userName, onStartQuickTest, loading }) => {
  return (
    <div style={styles.bannerContainer}>
      <div style={styles.bannerContent}>
        <div style={styles.bannerTextContent}>
          <h2 style={styles.bannerTitle}>Ready to challenge yourself, {userName}?</h2>
          <p style={styles.bannerDescription}>
            Improve your skills with daily practice tests tailored to your learning journey.
          </p>
          <div style={styles.bannerActions}>
            <button 
              style={styles.bannerPrimaryButton}
              onClick={onStartQuickTest}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner"></span> : 'Start Quick Test'}
            </button>
            <button style={styles.bannerSecondaryButton}>
              View Study Plan
            </button>
          </div>
        </div>
        <div style={styles.bannerImageContainer}>
          <img 
            src="/assets/dashboard-illustration.svg" 
            alt="Study illustration" 
            style={styles.bannerImage}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(null);
  const [userExam, setUserExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userData, setUserData] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [tests, setTests] = useState([]);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [createTestType, setCreateTestType] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [recentTests, setRecentTests] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    totalQuestions: 0,
    timeSpent: 0
  });
  const [quickTestOptions, setQuickTestOptions] = useState({
    subject: 'all',
    difficulty: 'mixed',
    questionCount: 10
  });
  const [customTestOptions, setCustomTestOptions] = useState({
    subjects: [],
    topics: [],
    difficulty: 'mixed',
    questionCount: 20,
    timeLimit: 30
  });
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [quickTestLoading, setQuickTestLoading] = useState(false);
  const [customTestLoading, setCustomTestLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExamSelector, setShowExamSelector] = useState(false);
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [exams, setExams] = useState([]);

  // Add a useRef for handling dropdown positioning and click outside behavior
  const examDropdownRef = useRef(null);
  const examButtonRef = useRef(null);

  // Add to useEffect for handling clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        examDropdownRef.current && 
        !examDropdownRef.current.contains(event.target) &&
        examButtonRef.current &&
        !examButtonRef.current.contains(event.target)
      ) {
        setExamDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [examDropdownRef, examButtonRef]);

  // Update the handleScroll function to use only viewport coordinates
  useEffect(() => {
    const handleScroll = () => {
      if (examDropdownOpen && examButtonRef.current && examDropdownRef.current) {
        const buttonRect = examButtonRef.current.getBoundingClientRect();
        const dropdownEl = examDropdownRef.current;
        
        // Position using viewport coordinates only (no scrollY/scrollX)
        requestAnimationFrame(() => {
          // Use viewport coordinates for fixed positioning
          dropdownEl.style.top = `${buttonRect.bottom}px`;
          dropdownEl.style.left = `${buttonRect.left}px`;
          
          // Ensure it doesn't go off-screen
          const dropdownRect = dropdownEl.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Handle horizontal overflow
          if (dropdownRect.right > viewportWidth - 20) {
            dropdownEl.style.left = `${viewportWidth - dropdownRect.width - 20}px`;
          }
          
          // Handle vertical overflow
          if (dropdownRect.bottom > viewportHeight - 20) {
            // If there's more space above, position above the button
            if (buttonRect.top > (viewportHeight - buttonRect.bottom)) {
              dropdownEl.style.top = 'auto';
              dropdownEl.style.bottom = `${viewportHeight - buttonRect.top}px`;
            } else {
              // Otherwise, constrain height to fit viewport
              dropdownEl.style.maxHeight = `${viewportHeight - dropdownRect.top - 20}px`;
            }
          }
        });
      }
    };

    // Key point: Only need resize event since fixed position is viewport-relative
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Position on initial open
    if (examDropdownOpen) {
      handleScroll();
    }
    
    return () => {
      window.removeEventListener('resize', handleScroll);
    };
  }, [examDropdownOpen]);

  // Add a small function to close dropdown on scroll
  useEffect(() => {
    const closeDropdownOnScroll = () => {
      if (examDropdownOpen) {
        setExamDropdownOpen(false);
      }
    };

    // Close dropdown on scroll - this is a common UX pattern for dropdowns
    window.addEventListener('scroll', closeDropdownOnScroll);
    
    return () => {
      window.removeEventListener('scroll', closeDropdownOnScroll);
    };
  }, [examDropdownOpen]);

  useEffect(() => {
    fetchUserProfile();
    checkAdminStatus();
    fetchTests();
    updateGreeting();
    fetchRecentTests();
    fetchStats();
    fetchAvailableSubjects();
    fetchAvailableTopics();
    if (userData && userData.is_new_user) {
      setShowOnboarding(true);
      
      const updateNewUserStatus = async () => {
        try {
          await supabase
            .from('users')
            .update({ is_new_user: false })
            .eq('id', userData.id);
        } catch (error) {
          console.error('Error updating new user status:', error);
        }
      };
      
      updateNewUserStatus();
    }
  }, [activeCategory]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setUserData(data);
        setUserName(data.name);
        setUserExam(data.selected_exam);
        if (data.avatar_url) {
          if (data.avatar_url.startsWith('http')) {
            setAvatar(data.avatar_url);
          } else {
            downloadAvatar(data.avatar_url);
          }
        }
        if (!data.preferred_exam) {
          setShowExamSelector(true);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);
      if (error) throw error;
      setAvatar(URL.createObjectURL(data));
    } catch (error) {
      console.error('Error downloading avatar:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(userData.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleSeeAllTests = () => {
    navigate('/tests');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      let query = supabase.from('tests');

      switch (activeCategory) {
        case 'recommended':
          query = query
            .select('*')
            .eq('type', 'recommended');
          break;
        case 'custom':
          query = query
            .select('*')
            .eq('type', 'custom');
          break;
        case 'completed':
          query = query
            .select(`
              *,
              user_tests!inner(
                score,
                status
              )
            `)
            .eq('user_tests.user_id', user.id)
            .eq('user_tests.status', 'completed');
          break;
        default:
          query = query.select('*');
      }

      query = query.limit(4);

      const { data, error } = await query;
      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  };

  const fetchRecentTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data: testsData, error: testsError } = await supabase
        .from('user_tests')
        .select(`
          id,
          created_at,
          completed_at,
          score,
          total_questions,
          time_spent,
          tests (
            id,
            name,
            subject
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (testsError) throw testsError;
      
      setRecentTests(testsData || []);
    } catch (error) {
      console.error('Error fetching recent tests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data: testsData, error: testsError } = await supabase
        .from('user_tests')
        .select(`
          id,
          created_at,
          completed_at,
          score,
          total_questions,
          time_spent,
          tests (
            id,
            name,
            subject
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (testsError) throw testsError;
      
      const completed = testsData.filter(test => test.completed_at);
      const totalScore = completed.reduce((sum, test) => sum + test.score, 0);
      const totalQuestions = completed.reduce((sum, test) => sum + test.total_questions, 0);
      const totalTime = completed.reduce((sum, test) => sum + (test.time_spent || 0), 0);
      
      setStats({
        testsCompleted: completed.length,
        averageScore: completed.length ? Math.round((totalScore / completed.length) * 100) / 100 : 0,
        totalQuestions,
        timeSpent: totalTime
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableSubjects = async () => {
    try {
      const { data, error } = await fetchAvailableExams();
      
      if (error) throw error;
      
      setAvailableSubjects(data || []);
    } catch (error) {
      console.error('Error fetching available subjects:', error);
    }
  };

  const fetchAvailableTopics = async () => {
    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .order('name');
        
      if (topicsError) throw topicsError;
      
      setAvailableTopics(topicsData || []);
    } catch (error) {
      console.error('Error fetching available topics:', error);
    }
  };

  const handleQuickTestOptionChange = (field, value) => {
    setQuickTestOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleCustomTestOptionChange = (field, value) => {
    setCustomTestOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleStartQuickTest = async () => {
    try {
      setQuickTestLoading(true);
      
      // Create a new test
      const { data: newTest, error: createError } = await supabase
        .from('tests')
        .insert([{
          name: 'Quick Test',
          test_description: 'Automatically generated quick test',
          duration_minutes: 30,
          question_count: quickTestOptions.questionCount,
          exam_id: userExam?.id
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      // Create user test record
      const { error: userTestError } = await supabase
        .from('user_tests')
        .insert([{
          test_id: newTest.id,
          user_id: userData.id,
          status: 'in_progress',
          total_questions: quickTestOptions.questionCount
        }]);

      if (userTestError) throw userTestError;
      
      navigate(`/test/${newTest.id}/questions`);
    } catch (error) {
      console.error('Error starting quick test:', error);
      setError('Failed to start quick test. Please try again.');
    } finally {
      setQuickTestLoading(false);
    }
  };
  
  const startCustomTest = async () => {
    try {
      setCustomTestLoading(true);
      setError(null);
      
      if (customTestOptions.subjects.length === 0) {
        throw new Error('Please select at least one subject');
      }
      
      // Create a new test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          name: `Custom Test - ${new Date().toLocaleDateString()}`,
          description: `Custom ${customTestOptions.questionCount} question test with ${customTestOptions.difficulty} difficulty`,
          is_custom_test: true,
          time_limit: customTestOptions.timeLimit
        })
        .select()
        .single();
        
      if (testError) throw testError;
      
      // Fetch random questions based on options
      const questionQuery = supabase
        .from('questions')
        .select('id')
        .order('id', { ascending: false });
        
      // Apply subject filter
      questionQuery.in('subject_id', customTestOptions.subjects);
      
      // Apply topic filter if any topics selected
      if (customTestOptions.topics.length > 0) {
        questionQuery.in('topic_id', customTestOptions.topics);
      }
      
      // Apply difficulty filter if not 'mixed'
      if (customTestOptions.difficulty !== 'mixed') {
        questionQuery.eq('difficulty', customTestOptions.difficulty);
      }
      
      // Limit to requested number of questions
      questionQuery.limit(customTestOptions.questionCount);
      
      const { data: questionsData, error: questionsError } = await questionQuery;
      
      if (questionsError) throw questionsError;
      
      if (!questionsData || questionsData.length === 0) {
        throw new Error('No questions available with the selected criteria');
      }
      
      // Create test questions
      const testQuestions = questionsData.map((q, index) => ({
        test_id: testData.id,
        question_id: q.id,
        order: index + 1
      }));
      
      const { error: testQuestionsError } = await supabase
        .from('test_questions')
        .insert(testQuestions);
        
      if (testQuestionsError) throw testQuestionsError;
      
      // Create user test record
      const { data: userTestData, error: userTestError } = await supabase
        .from('user_tests')
        .insert({
          user_id: userData.id,
          test_id: testData.id,
          total_questions: questionsData.length
        })
        .select()
        .single();
        
      if (userTestError) throw userTestError;
      
      // Navigate to test
      navigate(`/test/${testData.id}/questions?user_test_id=${userTestData.id}`);
      
    } catch (error) {
      console.error('Error starting custom test:', error);
      setError(error.message || 'Failed to start custom test. Please try again.');
    } finally {
      setCustomTestLoading(false);
    }
  };
  
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const userNameDisplay = userName || 'User';
  const userExamDisplay = userExam || null;

  // Enhanced exam selection handling with better UX
  const handleSelectExam = async (examId, examName) => {
    try {
      // Visual feedback - show loading state
      const selectedButton = document.getElementById(`exam-option-${examId}`);
      if (selectedButton) {
        selectedButton.innerHTML = '<span class="loading-spinner"></span> Selecting...';
        selectedButton.disabled = true;
      }
      
      // Update user profile with selected exam
      const { success, error } = await updateUserExam(userData.id, examId);
      
      if (!success) throw error;
      
      // Update local state with smooth transition
      setUserExam(examName); // Use the name directly for immediate UI update
      
      // Provide visual feedback before closing
      setTimeout(() => {
        setExamDropdownOpen(false);
        setShowExamSelector(false);
        
        // Refresh dashboard data
        fetchUserProfile();
        fetchTests();
        
        // Show success toast or feedback
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `<span>✓</span> Exam set to ${examName}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.classList.add('show');
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
              document.body.removeChild(toast);
            }, 300);
          }, 3000);
        }, 600);
      }, 600);
    } catch (error) {
      console.error('Error updating preferred exam:', error);
      // Show error feedback
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.innerHTML = `<span>✕</span> Failed to set exam. Please try again.`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }, 100);
    }
  };

  const renderDropdown = () => {
    if (!examDropdownOpen) return null;
    
    return ReactDOM.createPortal(
      <div 
        ref={examDropdownRef}
        style={styles.examDropdown}
        role="listbox"
        tabIndex="-1"
      >
        <div style={styles.dropdownHeader}>
          <span style={typography.textMdBold}>Select Your Exam</span>
            <button
            onClick={() => setExamDropdownOpen(false)}
            style={styles.closeDropdownButton}
            aria-label="Close dropdown"
            >
            ×
            </button>
        </div>
        
        {availableSubjects && availableSubjects.length > 0 ? (
          <>
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search exams..."
                style={styles.searchInput}
                onChange={(e) => {
                  // Implement search filter here
                  const searchText = e.target.value.toLowerCase();
                  // Filter availableSubjects based on search
                  // This would be better with a separate filteredSubjects state
                }}
              />
            </div>
            
            <div style={styles.dropdownItems} className="custom-scrollbar">
              {availableSubjects.map(subject => (
                <div
                  id={`exam-option-${subject.id}`}
                  key={subject.id}
                  onClick={() => handleSelectExam(subject.id, subject.name)}
                  style={styles.dropdownItem}
                  role="option"
                  aria-selected={false}
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectExam(subject.id, subject.name);
                    }
                  }}
                >
                  <div style={styles.examIconContainer}>
                    <span style={styles.examIcon}>{subject.icon || '📚'}</span>
                  </div>
                  <div style={styles.examTextContainer}>
                    <span style={styles.examName}>{subject.name}</span>
                    {subject.description && (
                      <span style={styles.examDescription}>
                        {subject.description.length > 60 
                          ? `${subject.description.substring(0, 60)}...` 
                          : subject.description}
                </span>
              )}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={styles.dropdownFooter}>
              <button 
                  onClick={() => {
                  setExamDropdownOpen(false);
                  setShowExamSelector(false);
                  }}
                style={styles.laterButton}
                >
                I'll choose later
              </button>
                </div>
          </>
        ) : (
          <div style={styles.noExamsMessage}>
            <div style={styles.emptyStateIcon}>🔍</div>
            <span style={typography.textMdMedium}>No exams available</span>
            <p style={typography.textSmRegular}>
              Please check back later or contact support for assistance.
            </p>
              </div>
            )}
      </div>,
      document.body
    );
  };

  const fetchExams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          category:category_id (
            name,
            category_description
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  }, []);

  return (
    <div className="dashboard-container scrollable">
      <div className="dashboard-navbar">
        <div className="dashboard-logo">
          <h1 style={typography.textXlBold}>EDTEC</h1>
          </div>
        
        <div className="nav-actions">
          {/* ... rest of the navbar content ... */}
        </div>
      </div>

      <div className="dashboard-banner">
        <DashboardBanner 
          userName={userNameDisplay} 
          onStartQuickTest={handleStartQuickTest}
          loading={quickTestLoading}
        />
      </div>

      <div className="dashboard-content">
        {/* Welcome Section with Stats */}
        <div style={styles.welcomeSection}>
          <div style={styles.greetingCard}>
            <div style={styles.greetingHeader}>
              <div>
                <div style={styles.timeGreeting}>
                  <TimeIcon />
                  <span style={typography.textSmRegular}>{greeting}</span>
                </div>
                <h2 style={typography.displayMdBold}>{userNameDisplay}</h2>
                
                {userExamDisplay ? (
                <div style={styles.examBadge}>
                    <span style={typography.textSmMedium}>{userExamDisplay}</span>
                </div>
                ) : (
                  <div style={styles.examSelectorContainer}>
                    <button 
                      ref={examButtonRef}
                      onClick={() => setExamDropdownOpen(!examDropdownOpen)}
                      style={styles.examSelectorButton}
                      aria-expanded={examDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span style={typography.textSmMedium}>Select Your Exam</span>
                      <span style={{
                        ...styles.dropdownArrow,
                        transform: examDropdownOpen ? 'rotate(180deg)' : 'rotate(0)'
                      }}>▼</span>
                    </button>
                    
                    {renderDropdown()}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📊</div>
              <div style={styles.statInfo}>
                <h3 style={typography.textLgBold}>
                  {stats.testsCompleted}
                </h3>
                <p style={typography.textSmRegular}>Tests Completed</p>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statIcon}>⏱️</div>
              <div style={styles.statInfo}>
                <h3 style={typography.textLgBold}>
                  {formatTime(stats.timeSpent)}
                </h3>
                <p style={typography.textSmRegular}>Time Spent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Redesigned as cards */}
        <div style={styles.actionButtonsContainer}>
          <div 
            style={styles.actionCard}
            onClick={() => {
              setCreateTestType('random');
              setShowCreateTest(true);
            }}
          >
            <div style={styles.actionCardIcon}>🎲</div>
            <div style={styles.actionCardContent}>
              <h3 style={typography.textLgMedium}>Quick Test</h3>
              <p style={typography.textSmRegular}>
                Generate a random test based on your preferences
              </p>
            </div>
          </div>
          
          <div 
            style={styles.actionCard}
            onClick={() => {
              setCreateTestType('custom');
              setShowCreateTest(true);
            }}
          >
            <div style={styles.actionCardIcon}>🎯</div>
            <div style={styles.actionCardContent}>
              <h3 style={typography.textLgMedium}>Custom Test</h3>
              <p style={typography.textSmRegular}>
                Create a personalized test with specific topics
              </p>
            </div>
          </div>
        </div>

        {/* Tests Section - Redesigned */}
        <section style={styles.testsSection}>
          <div style={styles.testsSectionHeader}>
            <h2 style={typography.textXlBold}>Your Tests</h2>
            <button 
              onClick={handleSeeAllTests}
              style={styles.seeAllButton}
            >
              See All Tests
            </button>
          </div>

          {/* Improved Test Categories */}
          <div style={styles.testCategoriesContainer}>
            <div style={styles.testCategories}>
              {['all', 'recommended', 'custom', 'completed'].map((category) => (
                <button 
                  key={category}
                  style={{
                    ...styles.category, 
                    ...(activeCategory === category && styles.activeCategory)
                  }}
                  onClick={() => setActiveCategory(category)}
                >
                  {category === 'all' && '🔍 '}
                  {category === 'recommended' && '🌟 '}
                  {category === 'custom' && '✏️ '}
                  {category === 'completed' && '✅ '}
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Updated Test Cards */}
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <p style={typography.textMdRegular}>Loading your tests...</p>
            </div>
          ) : tests.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📝</div>
              <h3 style={typography.textLgMedium}>No tests found</h3>
              <p style={typography.textSmRegular}>
                No {activeCategory} tests available at the moment
              </p>
              <button 
                style={styles.createTestButton}
                onClick={() => {
                  setCreateTestType('random');
                  setShowCreateTest(true);
                }}
              >
                Create your first test
              </button>
            </div>
          ) : (
            <div style={styles.testGrid}>
              {tests.map((test) => (
                <div 
                  key={test.id} 
                  style={styles.testCard}
                  onClick={() => navigate(`/test/${test.id}`)}
                >
                  <div style={styles.testCardHeader}>
                    <h3 style={typography.textMdBold}>{test.name}</h3>
                    {test.user_tests && (
                      <div style={styles.completedBadge}>Completed</div>
                    )}
                  </div>
                  
                  <div style={styles.testCardDetails}>
                    <div style={styles.testDetail}>
                      <span style={styles.testDetailIcon}>❓</span>
                      <span style={typography.textSmRegular}>
                        {test.question_count} questions
                      </span>
                    </div>
                    
                    <div style={styles.testDetail}>
                      <span style={styles.testDetailIcon}>⏱️</span>
                      <span style={typography.textSmRegular}>
                        {test.duration_minutes} minutes
                      </span>
                    </div>
                    
                    <div style={styles.testDetail}>
                      <span style={styles.testDetailIcon}>📊</span>
                      <span style={typography.textSmRegular}>
                        {test.difficulty} difficulty
                      </span>
                    </div>
                  </div>
                  
                  {test.user_tests ? (
                    <div style={styles.scoreContainer}>
                      <div style={styles.scoreBar}>
                        <div 
                          style={{
                            ...styles.scoreProgress,
                            width: `${(test.user_tests[0]?.score / test.question_count) * 100}%`
                          }}
                        ></div>
                      </div>
                      <div style={styles.scoreText}>
                        Score: {test.user_tests[0]?.score}/{test.question_count}
                      </div>
                    </div>
                  ) : (
                    <div style={styles.testCardFooter}>
                      <button 
                        style={styles.startTestButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/test/${test.id}`);
                        }}
                      >
                        Start Test
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        userData={userData}
        onUpdate={fetchUserProfile}
      />

      <CreateTestModal
        isOpen={showCreateTest}
        onClose={() => {
          setShowCreateTest(false);
          setCreateTestType(null);
          fetchTests();
        }}
        type={createTestType}
      />

      {showOnboarding && (
        <div style={styles.modalOverlay}>
          <div style={styles.onboardingModal}>
            <h2 style={typography.textXlBold}>Welcome to ExamPrep!</h2>
            <p style={typography.textMdRegular}>
              We're excited to help you prepare for your exams. Here's a quick overview of what you can do:
            </p>
            
            <div style={styles.onboardingSteps}>
              <div style={styles.onboardingStep}>
                <div style={styles.stepNumber}>1</div>
                <div style={styles.stepContent}>
                  <h3 style={typography.textMdBold}>Browse Available Tests</h3>
                  <p style={typography.textSmRegular}>
                    Explore our collection of practice tests designed to help you prepare.
                  </p>
                </div>
              </div>
              
              <div style={styles.onboardingStep}>
                <div style={styles.stepNumber}>2</div>
                <div style={styles.stepContent}>
                  <h3 style={typography.textMdBold}>Take Practice Tests</h3>
                  <p style={typography.textSmRegular}>
                    Complete tests to assess your knowledge and identify areas for improvement.
                  </p>
                </div>
              </div>
              
              <div style={styles.onboardingStep}>
                <div style={styles.stepNumber}>3</div>
                <div style={styles.stepContent}>
                  <h3 style={typography.textMdBold}>Track Your Progress</h3>
                  <p style={typography.textSmRegular}>
                    Monitor your performance and see how you improve over time.
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              style={styles.onboardingButton}
              onClick={() => setShowOnboarding(false)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  contentContainer: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  welcomeSection: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  greetingCard: {
    flex: '1 1 60%',
    backgroundColor: colors.brandPrimary,
    borderRadius: '16px',
    padding: '24px',
    color: colors.backgroundPrimary,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    backgroundImage: 'linear-gradient(120deg, #6b74e0, #4956e3)',
    position: 'relative',
    overflow: 'hidden',
  },
  greetingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeGreeting: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  examBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '6px 12px',
    borderRadius: '20px',
    marginTop: '12px',
    display: 'inline-flex',
  },
  statsContainer: {
    flex: '1 1 30%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flex: 1,
  },
  statIcon: {
    fontSize: '24px',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: colors.backgroundSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  actionButtonsContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  actionCard: {
    flex: '1 1 45%',
    minWidth: '250px',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
    }
  },
  actionCardIcon: {
    fontSize: '28px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: colors.backgroundSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  testsSection: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  testsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  seeAllButton: {
    backgroundColor: 'transparent',
    color: colors.brandPrimary,
    border: 'none',
    ...typography.textSmMedium,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
    }
  },
  testCategoriesContainer: {
    position: 'relative',
    marginBottom: '24px',
  },
  testCategories: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
    scrollbarWidth: 'thin',
    msOverflowStyle: 'none',
    '::-webkit-scrollbar': {
      height: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: colors.textSecondary,
      borderRadius: '4px',
    }
  },
  category: {
    padding: '8px 16px',
    borderRadius: '30px',
    border: `1px solid ${colors.backgroundSecondary}`,
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
    ...typography.textSmMedium,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
    }
  },
  activeCategory: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: `1px solid ${colors.brandPrimary}`,
  },
  testGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  testCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    border: `1px solid ${colors.backgroundSecondary}`,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
    }
  },
  testCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  completedBadge: {
    backgroundColor: colors.accentSuccess + '30',
    color: colors.accentSuccess,
    ...typography.textXsRegular,
    padding: '4px 8px',
    borderRadius: '4px',
  },
  testCardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  testDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  testDetailIcon: {
    fontSize: '16px',
    color: colors.textSecondary,
  },
  testCardFooter: {
    marginTop: 'auto',
  },
  startTestButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '8px',
    ...typography.textSmMedium,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#3f49cb',
    }
  },
  scoreContainer: {
    marginTop: '12px',
  },
  scoreBar: {
    height: '8px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: colors.accentSuccess,
    borderRadius: '4px',
  },
  scoreText: {
    ...typography.textSmMedium,
    color: colors.accentSuccess,
    textAlign: 'right',
  },
  profileAvatar: {
    width: '40px',
    height: '40px',
    backgroundColor: colors.brandPrimary,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: `2px solid ${colors.backgroundSecondary}`,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarText: {
    color: colors.backgroundPrimary,
    ...typography.textMdBold,
  },
  adminButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.brandPrimary,
    border: 'none',
    ...typography.textSmMedium,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: colors.backgroundSecondary + 'dd',
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.backgroundSecondary}`,
    borderTop: `3px solid ${colors.brandPrimary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    gap: '16px',
    textAlign: 'center',
  },
  emptyStateIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    opacity: 0.7,
  },
  createTestButton: {
    padding: '10px 24px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '8px',
    ...typography.textSmMedium,
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#3f49cb',
    }
  },
  bannerContainer: {
    backgroundColor: colors.brandPrimary + '10',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    border: `1px solid ${colors.brandPrimary}30`,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      textAlign: 'center',
    },
  },
  bannerTextContent: {
    flex: '1',
    zIndex: '1',
  },
  bannerTitle: {
    ...typography.displaySmBold,
    color: colors.textPrimary,
    marginBottom: '12px',
  },
  bannerDescription: {
    ...typography.textMdRegular,
    color: colors.textSecondary,
    marginBottom: '24px',
    maxWidth: '500px',
  },
  bannerActions: {
    display: 'flex',
    gap: '12px',
    '@media (max-width: 768px)': {
      justifyContent: 'center',
    },
  },
  bannerPrimaryButton: {
    backgroundColor: colors.brandPrimary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    ...typography.textMdBold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#3730a3',
    },
  },
  bannerSecondaryButton: {
    backgroundColor: 'transparent',
    color: colors.brandPrimary,
    border: `1px solid ${colors.brandPrimary}`,
    borderRadius: '8px',
    padding: '12px 20px',
    ...typography.textMdBold,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: colors.brandPrimary + '10',
    },
  },
  bannerImageContainer: {
    flex: '0 0 240px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },
  bannerImage: {
    maxWidth: '100%',
    height: 'auto',
    objectFit: 'contain',
  },
  onboardingModal: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  onboardingSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    margin: '32px 0',
  },
  onboardingStep: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typography.textMdBold,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  onboardingButton: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    ...typography.textMdBold,
    cursor: 'pointer',
    alignSelf: 'center',
    marginTop: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  examSelectorContainer: {
    position: 'relative',
    marginTop: '12px',
    zIndex: 500,
  },
  examSelectorButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    cursor: 'pointer',
    ...typography.textSmMedium,
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
    ':active': {
      transform: 'translateY(0)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${colors.brandPrimary}, 0 1px 2px rgba(0, 0, 0, 0.1)`,
    },
  },
  dropdownArrow: {
    fontSize: '10px',
    opacity: 0.8,
    transition: 'transform 0.2s ease',
  },
  examDropdown: {
    position: 'fixed',
    top: 'auto',
    left: 'auto',
    width: '320px',
    maxWidth: '90vw',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    overflow: 'hidden',
    border: `1px solid ${colors.borderPrimary}`,
    opacity: 1,
    animation: 'dropdownFadeIn 0.2s ease-in-out',
    transition: 'top 0.05s ease-out, left 0.05s ease-out',
    transformOrigin: 'top left',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: `1px solid ${colors.borderPrimary}`,
    backgroundColor: colors.backgroundPrimary,
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  closeDropdownButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: colors.textSecondary,
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 0.8,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
      color: colors.textPrimary,
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${colors.brandPrimary}`,
    },
  },
  searchContainer: {
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.borderPrimary}`,
    backgroundColor: colors.backgroundPrimary,
    position: 'sticky',
    top: '53px',
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: `1px solid ${colors.borderPrimary}`,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    ...typography.textSmRegular,
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      borderColor: colors.brandPrimary,
      boxShadow: `0 0 0 2px ${colors.brandPrimaryLight}`,
    },
    '::placeholder': {
      color: colors.textSecondary,
      opacity: 0.7,
    },
  },
  dropdownItems: {
    maxHeight: '300px',
    overflowY: 'auto',
    paddingBottom: '8px',
    WebkitOverflowScrolling: 'touch',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
    },
    ':focus': {
      outline: 'none',
      backgroundColor: colors.backgroundSecondary,
    },
    ':active': {
      backgroundColor: colors.backgroundTertiary,
    },
  },
  examIconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: colors.backgroundSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  examTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  examName: {
    ...typography.textMdMedium,
    color: colors.textPrimary,
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  examDescription: {
    ...typography.textSmRegular,
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropdownFooter: {
    padding: '12px 16px',
    borderTop: `1px solid ${colors.borderPrimary}`,
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: colors.backgroundPrimary,
    position: 'sticky',
    bottom: 0,
    zIndex: 2,
  },
  laterButton: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 12px',
    color: colors.textSecondary,
    cursor: 'pointer',
    ...typography.textSmMedium,
    transition: 'all 0.2s ease',
    borderRadius: '6px',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
      color: colors.textPrimary,
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${colors.brandPrimary}`,
    },
  },
  noExamsMessage: {
    padding: '32px 16px',
    textAlign: 'center',
    color: colors.textSecondary,
    ...typography.textSmRegular,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
};

export default Dashboard; 