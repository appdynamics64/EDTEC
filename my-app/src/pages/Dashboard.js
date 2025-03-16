import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import ProfileModal from '../components/ProfileModal';

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
  const [userTests, setUserTests] = useState([]);

  // Filter tests based on activeFilter
  const filteredTests = tests.filter(test => {
    switch (activeFilter) {
      case 'completed':
        return test.user_test_progress.status === 'completed';
      case 'recommended':
        return test.type === 'recommended';
      case 'custom':
        return test.type === 'custom';
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
          .select('id, name, selected_exam_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData?.selected_exam_id) throw new Error('No exam selected');

        setUserData(profileData);

        // Get exam details
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', profileData.selected_exam_id)
          .maybeSingle();

        if (examError) throw examError;
        if (!examData) throw new Error('Exam not found');

        setSelectedExam(examData);

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

  useEffect(() => {
    const fetchUserTests = async () => {
      try {
        setLoading(true);
        
        // Updated query to remove status field which doesn't exist
        const { data: tests, error } = await supabase
          .from('tests')
          .select(`
            id,
            test_name,
            test_duration,
            number_of_questions,
            type,
            test_attempts!left (
              id,
              start_time,
              end_time,
              final_score,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process the tests to determine status based on start_time and end_time
        const processedTests = tests.map(test => {
          const attempts = test.test_attempts || [];
          // Sort attempts by created_at in descending order and get the latest
          const latestAttempt = attempts.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          )[0];

          let status = 'not_started';
          if (latestAttempt) {
            if (latestAttempt.end_time || latestAttempt.final_score !== null) {
              status = 'completed';
            } else if (latestAttempt.start_time) {
              status = 'in_progress';
            }
          }

          return {
            ...test,
            status,
            lastAttemptDate: latestAttempt?.created_at || null,
            completed: status === 'completed'
          };
        });

        setUserTests(processedTests);
      } catch (error) {
        console.error('Error fetching tests:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserTests();
    }
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
          <span>Type:</span>
          <span style={styles.testType}>{test.type}</span>
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
      {/* Header with Profile */}
      <header style={styles.header}>
        <div style={styles.userProfile}>
          <div 
            style={styles.profileSection} 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div style={styles.avatarPlaceholder}>
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
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
      </header>

      {/* Exam Header */}
      <div style={styles.examHeader}>
        <h1>{selectedExam?.exam_name}</h1>
        <p>Prepare for your success</p>
      </div>

      {/* Test Filters */}
      <div style={styles.filters}>
        {['all', 'completed', 'recommended', 'custom'].map(filter => (
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

      {/* Tests Grid */}
      <div style={styles.testGrid}>
        {filteredTests.map(test => renderTestCard(test))}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userData={userData}
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
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '4px',
    color: '#374151',
    '&:hover': {
      backgroundColor: '#f3f4f6',
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
};

// Add some CSS to your global styles or component
const globalStyles = `
  .test-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
`;

export default Dashboard;
