import React, { useState, useEffect } from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { fetchAvailableExams, updateUserExam } from '../services/ExamService';

const ExamSelection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentExam, setCurrentExam] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUserAndExams = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          navigate('/login');
          return;
        }
        
        setUser(user);
        
        // Get user's current preferred exam
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('preferred_exam')
          .eq('id', user.id)
          .single();
        
        if (userDataError) throw userDataError;
        
        if (userData.preferred_exam) {
          setSelectedExam(userData.preferred_exam);
          setCurrentExam(userData.preferred_exam);
        }
        
        // Load available exams
        const { data: examsData, error: examsError } = await fetchAvailableExams();
        
        if (examsError) throw examsError;
        
        setExams(examsData || []);
      } catch (error) {
        console.error('Error loading exam selection:', error);
        setError('Failed to load exam options. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndExams();
  }, [navigate]);

  const handleExamSelect = async (examId) => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      // Update the profile with the selected exam
      const { error } = await supabase
        .from('profiles')
        .update({ selected_exam_id: examId })
        .eq('id', user.id);
        
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error selecting exam:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Only update if the selection has changed
      if (selectedExam !== currentExam) {
        const { success, error } = await updateUserExam(user.id, selectedExam);
        
        if (!success) throw error;
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating exam selection:', error);
      setError('Failed to update your exam selection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={typography.textMdRegular}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Change Your Exam</h1>
        <p style={styles.description}>
          Select the exam you want to prepare for. This will personalize your test recommendations and study plans.
        </p>
        
        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}
        
        <div style={styles.examGrid}>
          {exams.map(exam => (
            <div
              key={exam.id}
              style={{
                ...styles.examCard,
                ...(selectedExam === exam.id ? styles.selectedExamCard : {})
              }}
              onClick={() => handleExamSelect(exam.id)}
            >
              <div style={styles.examIcon}>{exam.icon}</div>
              <div style={styles.examInfo}>
                <h3 style={styles.examName}>{exam.name}</h3>
                {exam.description && (
                  <p style={styles.examDescription}>{exam.description}</p>
                )}
              </div>
              {selectedExam === exam.id && (
                <div style={styles.selectedCheckmark}>✓</div>
              )}
            </div>
          ))}
        </div>
        
        <div style={styles.actions}>
          <button
            style={styles.cancelButton}
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </button>
          <button
            style={styles.saveButton}
            onClick={handleSubmit}
            disabled={submitting || selectedExam === currentExam}
          >
            {submitting ? 'Saving...' : 'Save Selection'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: colors.brandPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: colors.error,
    margin: '10px 0',
  },
  select: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  loadingSpinner: {
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  description: {
    fontSize: '16px',
    marginBottom: '20px',
  },
  errorAlert: {
    backgroundColor: colors.error,
    color: '#fff',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  examGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  examCard: {
    width: '48%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  selectedExamCard: {
    borderColor: colors.brandPrimary,
  },
  examIcon: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  examInfo: {
    textAlign: 'center',
  },
  examName: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  examDescription: {
    fontSize: '14px',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    fontSize: '20px',
    color: colors.brandPrimary,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  cancelButton: {
    backgroundColor: colors.error,
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  saveButton: {
    backgroundColor: colors.brandPrimary,
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default ExamSelection; 