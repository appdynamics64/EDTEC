import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import LoadingScreen from '../components/LoadingScreen';
import { FaMedal, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('weekly'); // 'weekly' or 'overall'

  useEffect(() => {
    fetchLeaderboardData();
  }, [filter]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      
      // Use the profiles table with specific column selection
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, profile_photo_url, weekly_xp, total_xp')
        .not(filter === 'weekly' ? 'weekly_xp' : 'total_xp', 'is', null)
        .order(filter === 'weekly' ? 'weekly_xp' : 'total_xp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const validUsers = data.filter(user => {
        const xpValue = filter === 'weekly' ? user.weekly_xp : user.total_xp;
        return xpValue > 0;
      }).map(user => ({
        ...user,
        weekly_xp: Number(user.weekly_xp || 0),
        total_xp: Number(user.total_xp || 0)
      }));

      setUsers(validUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          <FaArrowLeft /> Back
        </button>
        <h1 style={styles.title}>Leaderboard</h1>
      </div>

      <div style={styles.filterContainer}>
        <button 
          style={{
            ...styles.filterButton,
            ...(filter === 'weekly' ? styles.activeFilter : {})
          }}
          onClick={() => setFilter('weekly')}
        >
          Weekly XP
        </button>
        <button 
          style={{
            ...styles.filterButton,
            ...(filter === 'overall' ? styles.activeFilter : {})
          }}
          onClick={() => setFilter('overall')}
        >
          Overall XP
        </button>
      </div>

      <div style={styles.leaderboardContainer}>
        {users.map((user, index) => (
          <div key={user.id} style={styles.userCard}>
            <div style={styles.rank}>
              {index < 3 ? (
                <FaMedal color={
                  index === 0 ? '#FFD700' : 
                  index === 1 ? '#C0C0C0' : 
                  '#CD7F32'
                } size={24} />
              ) : (
                `#${index + 1}`
              )}
            </div>
            <div style={styles.userInfo}>
              {user.profile_photo_url ? (
                <img 
                  src={user.profile_photo_url} 
                  alt={user.name} 
                  style={styles.avatar} 
                />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={styles.userName}>{user.name}</span>
            </div>
            <div style={styles.xpContainer}>
              <span style={styles.xpValue}>
                {filter === 'weekly' ? user.weekly_xp : user.total_xp} XP
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginRight: '16px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
  },
  filterContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  filterButton: {
    padding: '8px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: '1px solid #3b82f6',
  },
  leaderboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  rank: {
    width: '48px',
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: '600',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
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
  },
  xpContainer: {
    marginLeft: 'auto',
  },
  xpValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#3b82f6',
  },
};

export default Leaderboard; 