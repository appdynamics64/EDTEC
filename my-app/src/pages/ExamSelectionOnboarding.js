import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import useAuth from '../hooks/useAuth';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import { fetchAvailableExams, updateUserExam, skipExamSelection } from '../services/ExamService';

const ExamSelectionOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentExams();
  }, []);

  const fetchCurrentExams = async () => {
    try {
      setLoading(true);
      const currentDate = new Date().toISOString();

      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          category:category_id (
            name,
            category_description
          ),
          tests (
            count
          )
        `)
        .gte('end_date', currentDate)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setExams(data);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (examId) => {
    setSelectedExam(examId);
  };

  const handleSubmit = async () => {
    if (!selectedExam) {
      const confirmed = window.confirm('Are you sure you want to continue without selecting an exam?');
      if (!confirmed) {
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      if (selectedExam) {
        // Update user profile with selected exam
        const { error: updateError } = await updateUserExam(user.id, selectedExam, true);
        
        if (updateError) {
          console.error('Error updating user exam:', updateError);
          setError('Failed to save your exam selection. Please try again.');
          throw updateError;
        }
      } else {
        // Just mark onboarding as completed without setting preferred exam
        const { error: skipError } = await skipExamSelection(user.id);
        
        if (skipError) {
          console.error('Error skipping exam selection:', skipError);
          setError('Failed to skip exam selection. Please try again.');
          throw skipError;
        }
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      // Error is already handled above
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSubmitting(true);
      
      // Mark onboarding as completed without setting preferred exam
      const { error: skipError } = await skipExamSelection(user.id);
      
      if (skipError) throw skipError;
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error skipping exam selection:', error);
      setError('Failed to skip. Please try again.');
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

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error Loading Exams</h2>
        <p>{error}</p>
        <button onClick={fetchCurrentExams}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Select Your Exam</h1>
        <p style={styles.description}>
          Choose the exam you're preparing for to get personalized test recommendations and study plans.
        </p>
        
        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}
        
        <div style={styles.examGrid}>
          {exams.length === 0 ? (
            <div style={styles.noExams}>
              <h2>No Current Exams</h2>
              <p>Check back later for upcoming exams</p>
            </div>
          ) : (
            exams.map(exam => (
              <div
                key={exam.id}
                style={{
                  ...styles.examCard,
                  ...(selectedExam === exam.id ? styles.selectedExamCard : {})
                }}
                onClick={() => handleExamSelect(exam.id)}
              >
                <div style={styles.examStatus}>
                  {new Date(exam.start_date) > new Date() ? (
                    <span style={styles.upcomingBadge}>Upcoming</span>
                  ) : (
                    <span style={styles.activeBadge}>Active</span>
                  )}
                </div>

                <h2 style={typography.textLgBold}>{exam.exam_name}</h2>
                <p style={typography.textMdRegular}>{exam.exam_description}</p>
                
                <div style={styles.examInfo}>
                  <div style={styles.infoItem}>
                    <span>Category</span>
                    <strong>{exam.category?.category_description}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Available Tests</span>
                    <strong>{exam.tests?.[0]?.count || 0}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>Start Date</span>
                    <strong>{new Date(exam.start_date).toLocaleDateString()}</strong>
                  </div>
                  <div style={styles.infoItem}>
                    <span>End Date</span>
                    <strong>{new Date(exam.end_date).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div style={styles.actions}>
          <button
            style={styles.skipButton}
            onClick={handleSkip}
            disabled={submitting}
          >
            I'll Choose Later
          </button>
          <button
            style={styles.continueButton}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    backgroundColor: colors.backgroundPrimary,
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  examCard: {
    padding: '20px',
    borderRadius: '8px',
    border: `1px solid ${colors.borderPrimary}`,
    backgroundColor: colors.backgroundPrimary,
    cursor: 'pointer',
    display: 'flex',
    gap: '16px',
    position: 'relative',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: colors.brandPrimary,
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    }
  },
  selectedExamCard: {
    borderColor: colors.brandPrimary,
    borderWidth: '2px',
    backgroundColor: colors.brandPrimaryLight,
  },
  examStatus: {
    position: 'absolute',
    top: '16px',
    right: '16px',
  },
  activeBadge: {
    backgroundColor: colors.success,
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  upcomingBadge: {
    backgroundColor: colors.warning,
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  examInfo: {
    flex: 1,
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  skipButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textMdMedium,
    '&:hover': {
      backgroundColor: colors.borderPrimary,
    },
    '&:disabled': {
      opacity: 0.7,
      cursor: 'not-allowed',
    }
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
    padding: '24px',
  },
  errorAlert: {
    backgroundColor: colors.errorLight,
    color: colors.errorDark,
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    ...typography.textMdRegular,
  },
  noExams: {
    textAlign: 'center',
    padding: '24px',
  },
};

export default ExamSelectionOnboarding; 