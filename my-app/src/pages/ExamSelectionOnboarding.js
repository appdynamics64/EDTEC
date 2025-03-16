import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const ExamSelectionOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, selected_exam_id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch exams
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, exam_name');

      if (examsError) {
        throw examsError;
      }

      if (!examsData || examsData.length === 0) {
        setError('No exams available');
        return;
      }

      setExams(examsData);

      // Pre-fill existing data if any
      if (profile?.name) setUserName(profile.name);
      if (profile?.selected_exam_id) setSelectedExam(profile.selected_exam_id);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleExamSelect = (examId) => {
    setSelectedExam(examId);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!userName.trim() || !selectedExam) {
      setError('Please enter your name and select an exam');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: userName.trim(),
          selected_exam_id: selectedExam,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      // Force a reload instead of using navigate
      // This ensures OnboardingGuard gets fresh data
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Error saving:', error);
      setError('Failed to save your information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={typography.textMdRegular}>Loading available exams...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button 
        onClick={async () => {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }}
        style={styles.logoutButton}
      >
        Logout
      </button>

      <div style={styles.content}>
        <h1 style={styles.title}>Welcome to ExamPrep</h1>
        
        {error ? (
          <div style={styles.errorContainer}>
            <h2>Error Loading Exams</h2>
            <p>{error}</p>
            <button 
              onClick={fetchData}
              style={styles.retryButton}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div style={styles.nameSection}>
              <label htmlFor="userName" style={styles.label}>Your Name</label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={styles.input}
                placeholder="Enter your name"
              />
            </div>

            <h2 style={styles.subtitle}>Select Your Exam</h2>
            
            <div style={styles.examGrid}>
              {exams.map(exam => (
                <div
                  key={exam.id}
                  style={{
                    ...styles.examCard,
                    ...(selectedExam === exam.id && styles.selectedExamCard)
                  }}
                  onClick={() => handleExamSelect(exam.id)}
                >
                  <h2 style={typography.textLgBold}>{exam.exam_name}</h2>
                </div>
              ))}
            </div>
            
            <div style={styles.actions}>
              <button
                style={styles.continueButton}
                onClick={handleSubmit}
                disabled={submitting || !userName.trim() || !selectedExam}
              >
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',  // Add this to position the logout button
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '800px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    ...typography.displaySmBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: '8px',
  },
  description: {
    ...typography.textLgRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: '32px',
  },
  examGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
    padding: '20px 0',
  },
  examCard: {
    padding: '20px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'center',
    marginBottom: '10px',
    transition: 'all 0.2s ease',
  },
  selectedExamCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#3b82f6',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  continueButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    ...typography.textMdMedium,
    '&:hover': {
      backgroundColor: colors.brandPrimaryDark,
    },
    '&:disabled': {
      opacity: 0.7,
      cursor: 'not-allowed',
    }
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
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
  errorContainer: {
    textAlign: 'center',
    padding: '20px',
    margin: '20px 0',
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: colors.brandPrimary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
    '&:hover': {
      backgroundColor: colors.brandPrimaryDark,
    }
  },
  noExams: {
    textAlign: 'center',
    padding: '24px',
  },
  nameSection: {
    marginBottom: '32px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    ...typography.textMdMedium,
    color: colors.textPrimary,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${colors.borderPrimary}`,
    fontSize: '16px',
    '&:focus': {
      outline: 'none',
      borderColor: colors.brandPrimary,
    },
  },
  subtitle: {
    ...typography.textXlBold,
    color: colors.textPrimary,
    marginBottom: '16px',
  },
  logoutButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.borderPrimary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    '&:hover': {
      backgroundColor: colors.backgroundSecondary,
    }
  },
};

export default ExamSelectionOnboarding; 