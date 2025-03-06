import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const AdminDebugger = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTests, setUserTests] = useState([]);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [logMessages, setLogMessages] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkAdminStatus();
    fetchData();
  }, [refreshTrigger]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      addLog('Fetching data...');

      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .order('name', { ascending: true });

      if (userError) throw userError;
      setUsers(userData);
      addLog(`Fetched ${userData.length} users`);

      // Fetch tests
      const { data: testData, error: testError } = await supabase
        .from('exam_tests')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });

      if (testError) throw testError;
      setTests(testData);
      addLog(`Fetched ${testData.length} tests`);

      // Fetch user tests based on filters
      let query = supabase
        .from('user_tests')
        .select('*, users(email, name), exam_tests(title)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
        addLog(`Filtering by user ID: ${selectedUser}`);
      }

      if (selectedTest) {
        query = query.eq('exam_test_id', selectedTest);
        addLog(`Filtering by test ID: ${selectedTest}`);
      }

      const { data: userTestData, error: userTestError } = await query;

      if (userTestError) throw userTestError;
      setUserTests(userTestData);
      addLog(`Fetched ${userTestData.length} user test records`);
    } catch (error) {
      console.error('Error fetching data:', error);
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    setLogMessages(prev => [
      { message, timestamp, type },
      ...prev.slice(0, 99) // Keep only the last 100 messages
    ]);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearFilters = () => {
    setSelectedUser(null);
    setSelectedTest(null);
    addLog('Cleared filters');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFixDuplicates = async () => {
    try {
      addLog('Starting duplicate cleanup...');
      
      // Get all users with multiple in-progress tests for the same exam
      const { data: duplicates, error } = await supabase.rpc('find_duplicate_in_progress_tests');
      
      if (error) throw error;
      
      addLog(`Found ${duplicates.length} users with duplicate in-progress tests`);
      
      // For each user, keep only the most recent in-progress test for each exam
      for (const dup of duplicates) {
        addLog(`Processing user ${dup.user_id} for exam ${dup.exam_test_id}`);
        
        // Get all in-progress tests for this user and exam
        const { data: tests, error: fetchError } = await supabase
          .from('user_tests')
          .select('id, created_at')
          .eq('user_id', dup.user_id)
          .eq('exam_test_id', dup.exam_test_id)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false });
          
        if (fetchError) throw fetchError;
        
        // Keep the most recent one, mark others as abandoned
        if (tests.length > 1) {
          const mostRecent = tests[0].id;
          const toAbandon = tests.slice(1).map(t => t.id);
          
          addLog(`Keeping test ${mostRecent}, abandoning ${toAbandon.length} others`);
          
          const { error: updateError } = await supabase
            .from('user_tests')
            .update({ status: 'abandoned' })
            .in('id', toAbandon);
            
          if (updateError) throw updateError;
        }
      }
      
      addLog('Duplicate cleanup completed successfully', 'success');
      handleRefresh();
    } catch (error) {
      console.error('Error fixing duplicates:', error);
      addLog(`Error fixing duplicates: ${error.message}`, 'error');
    }
  };

  const handleAbandonTest = async (testId) => {
    try {
      addLog(`Abandoning test ${testId}...`);
      
      const { error } = await supabase
        .from('user_tests')
        .update({ status: 'abandoned' })
        .eq('id', testId);
        
      if (error) throw error;
      
      addLog(`Successfully abandoned test ${testId}`, 'success');
      handleRefresh();
    } catch (error) {
      console.error('Error abandoning test:', error);
      addLog(`Error abandoning test: ${error.message}`, 'error');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test record? This action cannot be undone.')) {
      return;
    }
    
    try {
      addLog(`Deleting test ${testId}...`);
      
      const { error } = await supabase
        .from('user_tests')
        .delete()
        .eq('id', testId);
        
      if (error) throw error;
      
      addLog(`Successfully deleted test ${testId}`, 'success');
      handleRefresh();
    } catch (error) {
      console.error('Error deleting test:', error);
      addLog(`Error deleting test: ${error.message}`, 'error');
    }
  };

  const createFixDuplicatesFunction = async () => {
    try {
      addLog('Creating database function to find duplicates...');
      
      const { error } = await supabase.rpc('create_find_duplicates_function', {
        sql_function: `
          CREATE OR REPLACE FUNCTION find_duplicate_in_progress_tests()
          RETURNS TABLE (user_id UUID, exam_test_id UUID, count BIGINT) AS $$
          BEGIN
            RETURN QUERY
            SELECT ut.user_id, ut.exam_test_id, COUNT(*) as count
            FROM user_tests ut
            WHERE ut.status = 'in_progress'
            GROUP BY ut.user_id, ut.exam_test_id
            HAVING COUNT(*) > 1;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (error) throw error;
      
      addLog('Database function created successfully', 'success');
    } catch (error) {
      console.error('Error creating function:', error);
      addLog(`Error creating function: ${error.message}`, 'error');
    }
  };

  if (loading && !isAdmin) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Checking permissions...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={styles.backButton}
          >
            ← Back
          </button>
          <h1 style={typography.textXlBold}>Admin Debugger</h1>
        </div>
        <div style={styles.headerRight}>
          <button 
            onClick={handleRefresh}
            style={styles.refreshButton}
          >
            🔄 Refresh
          </button>
          <button 
            onClick={handleFixDuplicates}
            style={styles.fixButton}
          >
            🔧 Fix Duplicates
          </button>
          <button 
            onClick={createFixDuplicatesFunction}
            style={styles.createFunctionButton}
          >
            📦 Create DB Function
          </button>
        </div>
      </div>
      
      <div style={styles.content}>
        <div style={styles.sidebar}>
          <div style={styles.filterSection}>
            <h2 style={typography.textLgBold}>Filters</h2>
            <div style={styles.filterItem}>
              <label style={typography.textSmBold}>User:</label>
              <select 
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value || null)}
                style={styles.select}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterItem}>
              <label style={typography.textSmBold}>Test:</label>
              <select 
                value={selectedTest || ''}
                onChange={(e) => setSelectedTest(e.target.value || null)}
                style={styles.select}
              >
                <option value="">All Tests</option>
                {tests.map(test => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleClearFilters}
              style={styles.clearButton}
            >
              Clear Filters
            </button>
          </div>
          
          <div style={styles.logSection}>
            <h2 style={typography.textLgBold}>Activity Log</h2>
            <div style={styles.logContainer}>
              {logMessages.map((log, index) => (
                <div 
                  key={index} 
                  style={{
                    ...styles.logMessage,
                    ...(log.type === 'error' ? styles.errorLog : {}),
                    ...(log.type === 'success' ? styles.successLog : {})
                  }}
                >
                  <div style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={styles.logText}>{log.message}</div>
                </div>
              ))}
              {logMessages.length === 0 && (
                <div style={styles.emptyLog}>No activity yet</div>
              )}
            </div>
          </div>
        </div>
        
        <div style={styles.mainContent}>
          <h2 style={typography.textLgBold}>User Test Records</h2>
          
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Test</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userTests.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.emptyTable}>
                        No records found
                      </td>
                    </tr>
                  ) : (
                    userTests.map(test => (
                      <tr key={test.id} style={
                        test.status === 'in_progress' 
                          ? styles.inProgressRow 
                          : test.status === 'abandoned'
                            ? styles.abandonedRow
                            : {}
                      }>
                        <td style={styles.td}>{test.id}</td>
                        <td style={styles.td}>{test.users?.name || test.users?.email || 'Unknown'}</td>
                        <td style={styles.td}>{test.exam_tests?.title || 'Unknown'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: 
                              test.status === 'completed' ? colors.successLight :
                              test.status === 'in_progress' ? colors.warningLight :
                              colors.errorLight,
                            color:
                              test.status === 'completed' ? colors.successDark :
                              test.status === 'in_progress' ? colors.warningDark :
                              colors.errorDark,
                          }}>
                            {test.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {new Date(test.created_at).toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            {test.status === 'in_progress' && (
                              <button 
                                onClick={() => handleAbandonTest(test.id)}
                                style={styles.abandonButton}
                              >
                                Abandon
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteTest(test.id)}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    minHeight: '100vh',
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textPrimary,
  },
  refreshButton: {
    backgroundColor: colors.infoLight,
    color: colors.infoDark,
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    ...typography.textSmBold,
  },
  fixButton: {
    backgroundColor: colors.warningLight,
    color: colors.warningDark,
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    ...typography.textSmBold,
  },
  createFunctionButton: {
    backgroundColor: colors.successLight,
    color: colors.successDark,
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    ...typography.textSmBold,
  },
  content: {
    display: 'flex',
    gap: '24px',
  },
  sidebar: {
    width: '300px',
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  filterItem: {
    marginBottom: '16px',
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderPrimary}`,
    backgroundColor: colors.backgroundPrimary,
    marginTop: '4px',
  },
  clearButton: {
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
    border: `1px solid ${colors.borderPrimary}`,
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    width: '100%',
    ...typography.textSmBold,
  },
  logSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '8px',
    padding: '16px',
  },
  logContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: '4px',
    padding: '8px',
    height: '400px',
    overflowY: 'auto',
    marginTop: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  logMessage: {
    marginBottom: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#2a2a2a',
  },
  errorLog: {
    backgroundColor: '#3a2a2a',
    borderLeft: '3px solid #ff6b6b',
  },
  successLog: {
    backgroundColor: '#2a3a2a',
    borderLeft: '3px solid #6bff6b',
  },
  logTime: {
    color: '#888',
    marginBottom: '2px',
  },
  logText: {
    color: '#fff',
  },
  emptyLog: {
    color: '#888',
    textAlign: 'center',
    padding: '16px',
  },
  tableContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '8px',
    padding: '16px',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.borderPrimary}`,
    ...typography.textSmBold,
  },
  td: {
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.borderPrimary}`,
    ...typography.textSmRegular,
  },
  inProgressRow: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  abandonedRow: {
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    ...typography.textXsBold,
    display: 'inline-block',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  abandonButton: {
    backgroundColor: colors.warningLight,
    color: colors.warningDark,
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    ...typography.textXsBold,
  },
  deleteButton: {
    backgroundColor: colors.errorLight,
    color: colors.errorDark,
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    ...typography.textXsBold,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.backgroundPrimary}`,
    borderTop: `3px solid ${colors.brandPrimary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyTable: {
    textAlign: 'center',
    padding: '24px',
    color: colors.textSecondary,
  },
};

export default AdminDebugger; 