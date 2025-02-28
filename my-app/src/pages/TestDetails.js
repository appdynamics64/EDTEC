import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestDetails = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_tests')
        .select(`
          *,
          exam:exams(name),
          user_tests(
            id,
            score,
            status,
            completed_at
          )
        `)
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTestData(data);
    } catch (error) {
      console.error('Error fetching test details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    try {
      // Create a new user_test entry
      const { data, error } = await supabase
        .from('user_tests')
        .insert({
          test_id: testId,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the test questions
      navigate(`/test/${testId}/questions`);
    } catch (error) {
      console.error('Error starting test:', error);
    }
  };

  const handleViewSolutions = () => {
    navigate(`/test/${testId}/solutions`);
  };

  const handleRedoTest = () => {
    handleStartTest(); // Reuse the start test logic
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (!testData) {
    return <div style={styles.container}>Test not found</div>;
  }

  const lastAttempt = testData.user_tests?.[0];
  const isCompleted = lastAttempt?.status === 'completed';

  return (
    <div style={styles.container}>
      <button onClick={handleBack} style={styles.backButton}>
        ←
      </button>

      <div style={styles.card}>
        <div style={styles.iconContainer}>
          {testData.type === 'recommended' && <span>👤</span>}
          {testData.type === 'random' && <span>🎲</span>}
          {testData.type === 'custom' && <span>✏️</span>}
        </div>

        <h1 style={typography.displayMdBold}>{testData.title}</h1>

        <div style={styles.detailsContainer}>
          <h2 style={typography.displayLgBold}>
            {testData.total_questions} Questions
          </h2>
          <p style={typography.textLgRegular}>{testData.duration} hours</p>
        </div>

        <div style={styles.bottomIconContainer}>
          <span style={styles.waveIcon}>👋</span>
        </div>

        {!isCompleted ? (
          <button 
            onClick={handleStartTest}
            style={styles.startButton}
          >
            <span style={styles.buttonIcon}>📝</span>
            Start test
          </button>
        ) : (
          <div style={styles.completedActions}>
            <div style={styles.scoreContainer}>
              <span style={typography.textLgBold}>Your Score</span>
              <span style={typography.displaySmBold}>
                {lastAttempt.score}/{testData.total_questions}
              </span>
            </div>
            <button 
              onClick={handleViewSolutions}
              style={styles.solutionsButton}
            >
              View solutions
            </button>
            <button 
              onClick={handleRedoTest}
              style={styles.redoButton}
            >
              Redo test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: '24px',
    padding: '32px',
    position: 'relative',
    overflow: 'hidden',
    color: colors.backgroundPrimary,
  },
  iconContainer: {
    fontSize: '32px',
    marginBottom: '16px',
  },
  detailsContainer: {
    marginTop: '32px',
    marginBottom: '48px',
  },
  bottomIconContainer: {
    position: 'absolute',
    bottom: '32px',
    right: '32px',
  },
  waveIcon: {
    fontSize: '32px',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: colors.backgroundPrimary,
    color: colors.brandPrimary,
    border: 'none',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
  buttonIcon: {
    fontSize: '20px',
  },
  completedActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  scoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  solutionsButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: colors.backgroundPrimary,
    color: colors.brandPrimary,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
  redoButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    ...typography.textLgBold,
  },
};

export default TestDetails; 