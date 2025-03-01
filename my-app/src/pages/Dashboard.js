import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import ProfileModal from '../components/ProfileModal';
import CreateTestModal from '../components/CreateTestModal';

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

  useEffect(() => {
    fetchUserProfile();
    checkAdminStatus();
    fetchTests();
    updateGreeting();
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

  const handleSeeAllClick = () => {
    navigate('/all-tests');
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

      let query = supabase.from('exam_tests');

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

  return (
    <div style={styles.container}>
      {/* Top Navigation Bar */}
      <div style={styles.navbar}>
        <div style={styles.logo}>
          <h1 style={typography.textXlBold}>EDTEC</h1>
        </div>
        
        <div style={styles.navActions}>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              style={styles.adminButton}
            >
              Admin Console
            </button>
          )}
          
          <div style={styles.profileContainer}>
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)} 
              style={styles.profileAvatar}
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Profile" 
                  style={styles.avatarImage}
                />
              ) : (
                <span style={styles.avatarText}>
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            
            {showProfileMenu && (
              <div style={styles.profileMenu}>
                <div 
                  style={styles.profileMenuItem}
                  onClick={() => {
                    setShowProfile(true);
                    setShowProfileMenu(false);
                  }}
                >
                  <span role="img" aria-label="profile">👤</span> Profile
                </div>
                <div 
                  style={styles.profileMenuItem}
                  onClick={handleLogout}
                >
                  <span role="img" aria-label="logout">🚪</span> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.contentContainer}>
        {/* Welcome Section with Stats */}
        <div style={styles.welcomeSection}>
          <div style={styles.greetingCard}>
            <div style={styles.greetingHeader}>
              <div>
                <div style={styles.timeGreeting}>
                  <TimeIcon />
                  <span style={typography.textSmRegular}>{greeting}</span>
                </div>
                <h2 style={typography.displayMdBold}>{userName || 'User'}</h2>
                <div style={styles.examBadge}>
                  <span style={typography.textSmMedium}>
                    {userExam || 'Select an exam'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📊</div>
              <div style={styles.statInfo}>
                <h3 style={typography.textLgBold}>
                  {tests.filter(t => t.user_tests).length}
                </h3>
                <p style={typography.textSmRegular}>Tests Completed</p>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statIcon}>⏱️</div>
              <div style={styles.statInfo}>
                <h3 style={typography.textLgBold}>
                  {tests.filter(t => t.type === 'recommended').length}
                </h3>
                <p style={typography.textSmRegular}>Available Tests</p>
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
              onClick={handleSeeAllClick}
              style={styles.seeAllButton}
            >
              See all tests
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
                    <h3 style={typography.textMdBold}>{test.test_name}</h3>
                    {test.user_tests && (
                      <div style={styles.completedBadge}>Completed</div>
                    )}
                  </div>
                  
                  <div style={styles.testCardDetails}>
                    <div style={styles.testDetail}>
                      <span style={styles.testDetailIcon}>❓</span>
                      <span style={typography.textSmRegular}>
                        {test.total_questions} questions
                      </span>
                    </div>
                    
                    <div style={styles.testDetail}>
                      <span style={styles.testDetailIcon}>⏱️</span>
                      <span style={typography.textSmRegular}>
                        {test.duration} minutes
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
                            width: `${(test.user_tests[0]?.score / test.total_questions) * 100}%`
                          }}
                        ></div>
                      </div>
                      <div style={styles.scoreText}>
                        Score: {test.user_tests[0]?.score}/{test.total_questions}
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
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#F5F7FA',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: colors.backgroundPrimary,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logo: {
    color: colors.brandPrimary,
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  profileContainer: {
    position: 'relative',
  },
  profileMenu: {
    position: 'absolute',
    top: '60px',
    right: 0,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '8px 0',
    minWidth: '160px',
    zIndex: 100,
  },
  profileMenuItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    ...typography.textSmMedium,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
    }
  },
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
    fontSize: '48px',
    marginBottom: '8px',
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
};

export default Dashboard; 