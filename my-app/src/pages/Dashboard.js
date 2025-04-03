import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import ProfileModal from '../components/ProfileModal';
import { FaUserCog, FaCheckCircle, FaClock, FaChartLine, FaTrophy, FaComments } from 'react-icons/fa';
import styled from 'styled-components';

// Add this colors object at the top of the file, after the imports
const colors = {
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  secondary: '#6B7280',
  secondaryLight: '#F3F4F6'
};

// Add this function before the Dashboard component
const getStatusStyle = (status) => {
  switch (status) {
    case 'completed':
      return {
        color: colors.success,
        backgroundColor: colors.successLight,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.875rem'
      };
    case 'in_progress':
      return {
        color: colors.warning,
        backgroundColor: colors.warningLight,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.875rem'
      };
    default:
      return {
        color: colors.secondary,
        backgroundColor: colors.secondaryLight,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.875rem'
      };
  }
};

const ProgressSummary = ({ totalQuestions, answeredQuestions }) => (
  <div style={styles.progressSummary}>
    <span>Progress: {answeredQuestions} / {totalQuestions}</span>
    <div style={styles.progressBar}>
      <div 
        style={{
          ...styles.progressFill,
          width: `${(answeredQuestions / totalQuestions) * 100}%`
        }}
      />
    </div>
  </div>
);

const StatisticsCard = ({ icon: Icon, title, value, subtext, color }) => (
  <div style={{
    ...styles.statsCard,
    borderLeft: `4px solid ${color}`
  }}>
    <div style={styles.statsIconWrapper}>
      <Icon size={24} color={color} />
    </div>
    <div style={styles.statsContent}>
      <h3 style={styles.statsValue}>{value}</h3>
      <span style={styles.statsTitle}>{title}</span>
      {subtext && <p style={styles.statsSubtext}>{subtext}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [tests, setTests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [availableExams, setAvailableExams] = useState([]);
  const [isChangingExam, setIsChangingExam] = useState(false);

  // Filter tests based on activeFilter
  const filteredTests = tests.filter(test => {
    switch (activeFilter) {
      case 'completed':
        return test.user_test_progress.status === 'completed';
      default:
        return true; // 'all' filter
    }
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, selected_exam_id, profile_photo_url')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData?.selected_exam_id) throw new Error('No exam selected');

        // Add email from user object to profileData
        setUserData({
          ...profileData,
          email: user.email
        });

        // Get all available exams
        const { data: exams, error: examsError } = await supabase
          .from('exams')
          .select('*')
          .order('exam_name');

        if (examsError) throw examsError;
        setAvailableExams(exams);

        // If no exam is selected, use the first available exam
        const selectedExamId = profileData?.selected_exam_id || exams[0]?.id;

        if (!selectedExamId) throw new Error('No exams available');

        // Get selected exam details
        const selectedExam = exams.find(exam => exam.id === selectedExamId);
        setSelectedExam(selectedExam);

        // Get tests with their attempts and final scores
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

        if (testsError) throw testsError;

        // Process tests with their attempt status and score
        const processedTests = testsData.map(test => {
          const attempts = test.test_attempts || [];
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

          return {
            ...test,
            user_test_progress: {
              status,
              attempt: {
                ...latestAttempt,
                // Use the stored final_score directly
                final_score: latestAttempt?.final_score ?? 'N/A'
              }
            }
          };
        });

        setTests(processedTests);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

    loadDashboardData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleTestClick = (testId, status) => {
    // Remove the conditional and always navigate to test-details
    navigate(`/test-details/${testId}`);
  };

  const getTestStatusDisplay = (test) => {
    switch (test.status) {
      case 'completed':
        return {
          text: 'Completed',
          color: colors.success,
          backgroundColor: colors.successLight
        };
      case 'in_progress':
        return {
          text: 'In Progress',
          color: colors.warning,
          backgroundColor: colors.warningLight
        };
      default:
        return {
          text: 'Not Started',
          color: colors.secondary,
          backgroundColor: colors.secondaryLight
        };
    }
  };

  const renderTestCard = (test) => (
    <div 
      key={test.id} 
      style={styles.testCard}
      onClick={() => handleTestClick(test.id, test.user_test_progress.status)}
      className="test-card"
    >
      <h2 style={styles.testTitle}>{test.test_name}</h2>
      <div style={styles.testInfo}>
        <div style={styles.infoItem}>
          <span>Questions:</span>
          <span>{test.number_of_questions}</span>
        </div>
        <div style={styles.infoItem}>
          <span>Duration:</span>
          <span>{test.test_duration} minutes</span>
        </div>
        <div style={styles.infoItem}>
          <span>Status:</span>
          <span style={getStatusStyle(test.user_test_progress.status)}>
            {test.user_test_progress.status === 'completed' 
              ? `Completed (Score: ${test.user_test_progress.attempt?.final_score !== 'N/A'
                  ? (Number(test.user_test_progress.attempt.final_score) < 0 ? '-' : '') +
                    Math.abs(Number(test.user_test_progress.attempt.final_score)).toFixed(2)
                  : 'N/A'}` 
              : test.user_test_progress.status === 'in_progress'
              ? 'In Progress'
              : 'Not Started'}
          </span>
        </div>
      </div>
      <button 
        style={{
          ...styles.startButton,
          ...(test.user_test_progress.status === 'completed' && styles.viewDetailsButton)
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click event
          navigate(`/test-details/${test.id}`);
        }}
      >
        {test.user_test_progress.status === 'completed' 
          ? 'View Details' 
          : test.user_test_progress.status === 'in_progress'
          ? 'Continue'
          : 'Start Test'}
      </button>
    </div>
  );

  const handleExamChange = async (newExamId) => {
    try {
      // Update the user's selected exam in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ selected_exam_id: newExamId })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh the dashboard data
      window.location.reload(); // Simple reload to refresh all data
    } catch (error) {
      console.error('Error changing exam:', error);
      alert('Failed to change exam. Please try again.');
    }
  };

  const ExamSelector = ({ currentExam, exams, onSelect, onClose }) => {
    if (!exams.length) return null;

  return (
      <div style={examSelectorStyles.overlay}>
        <div style={examSelectorStyles.modal}>
          <h2 style={examSelectorStyles.title}>Select Exam</h2>
          <div style={examSelectorStyles.examList}>
            {exams.map(exam => (
              <button
                key={exam.id}
                style={{
                  ...examSelectorStyles.examButton,
                  ...(currentExam?.id === exam.id && examSelectorStyles.selectedExam)
                }}
                onClick={() => onSelect(exam.id)}
              >
                {exam.exam_name}
              </button>
            ))}
          </div>
                    <button 
            style={examSelectorStyles.closeButton}
            onClick={onClose}
          >
            Cancel
                    </button>
                  </div>
              </div>
    );
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const renderStatistics = () => {
    // Calculate statistics from tests array
    const totalTests = tests.length;
    const completedTests = tests.filter(test => 
      test.user_test_progress.status === 'completed'
    ).length;
    
    // Calculate average score from completed tests
    const completedTestScores = tests
      .filter(test => test.user_test_progress.status === 'completed')
      .map(test => Number(test.user_test_progress.attempt?.final_score) || 0);
    
    const averageScore = completedTestScores.length 
      ? (completedTestScores.reduce((a, b) => a + b, 0) / completedTestScores.length).toFixed(1)
      : 0;

    // Find best score
    const bestScore = Math.max(...completedTestScores, 0).toFixed(1);

    return (
      <div style={styles.statisticsContainer}>
        <h2 style={styles.statisticsTitle}>Your Progress Overview</h2>
        <div style={styles.statisticsGrid}>
          <StatisticsCard
            icon={FaCheckCircle}
            title="Tests Completed"
            value={`${completedTests}/${totalTests}`}
            subtext="Keep going!"
            color="#4CAF50"
          />
          <StatisticsCard
            icon={FaChartLine}
            title="Average Score"
            value={`${averageScore}%`}
            subtext={averageScore > 70 ? "Excellent work!" : "Room for improvement"}
            color="#2196F3"
          />
          <StatisticsCard
            icon={FaTrophy}
            title="Best Score"
            value={`${bestScore}%`}
            subtext="Your highest achievement"
            color="#FFC107"
          />
        </div>
      </div>
    );
  };

  const handleProfileUpdate = (updatedData) => {
    setUserData(updatedData);
    // You might want to refresh other parts of the UI that display user data
  };

  if (loading) return <LoadingScreen />;
  if (error) return (
    <div style={styles.errorContainer}>
      <h2>Error</h2>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} style={styles.retryButton}>
        Retry
                    </button>
              </div>
  );

  return (
    <div style={styles.container}>
      {/* New Navigation Bar */}
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.logo}>
            PREP<span style={styles.logoHighlight}>HUB</span>
          </div>
          <div style={styles.examSelector}>
            <span style={styles.examName}>{selectedExam?.exam_name}</span>
            <button 
              onClick={() => setIsChangingExam(true)}
              style={styles.changeExamButtonSmall}
            >
              Change
            </button>
          </div>
        </div>
        <div style={styles.userProfile}>
          <div 
            style={styles.profileSection} 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {userData?.profile_photo_url ? (
              <img 
                src={userData.profile_photo_url} 
                alt={userData?.name || 'User'} 
                style={styles.avatarImage} 
              />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span style={styles.userName}>{userData?.name || 'User'}</span>
          </div>
          
          {showProfileMenu && (
            <div style={styles.profileMenu}>
              <button 
                style={styles.menuItem}
                onClick={() => {
                  setShowProfileModal(true);
                  setShowProfileMenu(false);
                }}
              >
                <FaUserCog style={{ marginRight: '8px' }} />
                Edit Profile
              </button>
              <button 
                style={styles.menuItem}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {renderStatistics()}
        
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Practice Tests</h2>
            <div style={styles.filters}>
              {['all', 'completed'].map(filter => (
                <button
                  key={filter}
                  style={{
                    ...styles.filterButton,
                    ...(activeFilter === filter && styles.activeFilter)
                  }}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.testGrid}>
            {filteredTests.map(test => renderTestCard(test))}
          </div>
        </div>
      </main>

      {/* Admin Console Link at Bottom */}
      <footer style={styles.footer}>
        <button 
          onClick={handleAdminClick}
          style={styles.adminLink}
        >
          <FaUserCog style={{ marginRight: '8px' }} />
          Admin Console
        </button>
      </footer>

      {/* Chatbot Button */}
      <div style={styles.chatbotButton}>
        <button
          onClick={() => navigate('/chatbot')}
          style={styles.chatButton}
          aria-label="Chat with AI assistant"
        >
          <FaComments size={24} />
        </button>
      </div>
      
      {/* Existing modals */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userData={userData}
          onUpdate={handleProfileUpdate}
        />
      )}

      {isChangingExam && (
        <ExamSelector
          currentExam={selectedExam}
          exams={availableExams}
          onSelect={(examId) => {
            handleExamChange(examId);
            setIsChangingExam(false);
          }}
          onClose={() => setIsChangingExam(false)}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },
  examHeader: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  testGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  },
  testCard: {
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  testTitle: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#333',
    fontWeight: '600',
  },
  testInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#666',
    fontSize: '0.95rem',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '400px',
    margin: '40px auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '20px',
    '&:hover': {
      backgroundColor: '#0056b3',
    },
  },
  noTests: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    color: '#666',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '30px',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f3f4f6',
    },
  },
  activeFilter: {
    backgroundColor: '#007bff',
    color: 'white',
    border: '1px solid #007bff',
  },
  testType: {
    textTransform: 'capitalize',
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  userProfile: {
    position: 'relative',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: '8px',
    '&:hover': {
      backgroundColor: '#f3f4f6',
    },
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '500',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
  },
  profileMenu: {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '5px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    padding: '5px',
    minWidth: '150px',
    zIndex: 10,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  startButton: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: 'auto',
    '&:hover': {
      backgroundColor: '#0056b3',
    },
    '&:disabled': {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
    },
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  viewDetailsButton: {
    backgroundColor: '#4A5568', // darker gray for completed tests
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#2D3748',
    },
  },
  examTitleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  changeExamButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
  },
  adminButton: {
    marginLeft: 'auto',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
  },
  progressSummary: {
    padding: '10px 15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#666',
  },
  progressBar: {
    height: '4px',
    backgroundColor: '#f1f1f1',
    borderRadius: '2px',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  statisticsContainer: {
    marginBottom: '40px',
    backgroundColor: '#f8fafc',
    padding: '24px',
    borderRadius: '12px',
  },
  statisticsTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px',
    textAlign: 'left',
  },
  statisticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  statsCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease',
    cursor: 'default',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
  statsIconWrapper: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
  },
  statsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statsValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  statsTitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500',
  },
  statsSubtext: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    margin: '4px 0 0 0',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  logoHighlight: {
    color: '#3b82f6',
  },
  examSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  examName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#4b5563',
  },
  changeExamButtonSmall: {
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#e5e7eb',
    },
  },
  mainContent: {
    padding: '24px',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    padding: '16px 24px',
    marginTop: 'auto',
  },
  adminLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#4b5563',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    '&:hover': {
      backgroundColor: '#f3f4f6',
    },
  },
  chatbotButton: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    zIndex: 1000,
  },
  chatButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    '&:hover': {
      transform: 'scale(1.05)',
      backgroundColor: '#2563eb',
    },
    '&:active': {
      transform: 'scale(0.95)',
    },
  },
  chatbotContainer: {
    position: 'fixed',
    bottom: '100px',
    right: '30px',
    width: '350px',
    height: '450px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
  },
  chatHeader: {
    padding: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  },
  chatCloseButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: '1',
  },
  chatMessages: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  chatMessage: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    padding: '12px 16px',
  },
  chatMessageText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.4',
  },
  chatInputContainer: {
    display: 'flex',
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  chatInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '20px',
    fontSize: '14px',
    outline: 'none',
    '&:focus': {
      borderColor: '#3b82f6',
    },
  },
  chatSendButton: {
    marginLeft: '8px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
  },
  avatarImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
};

const examSelectorStyles = {
  overlay: {
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
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '1.5rem',
    fontWeight: '600',
  },
  examList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  examButton: {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '1rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f3f4f6',
    },
  },
  selectedExam: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    '&:hover': {
      backgroundColor: '#4B5563',
    },
  },
};

export default Dashboard; 
