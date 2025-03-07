import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const ExamDetails = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const location = useLocation();
  const [exam, setExam] = useState(location.state?.examData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    if (!exam) {
      fetchExamDetails();
    } else {
      setLoading(false);
    }
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          exam_sections (
            id,
            section_name,
            section_description
          ),
          tests (
            id,
            title,
            question_count,
            duration_minutes
          )
        `)
        .eq('id', examId)
        .single();

      if (error) throw error;
      setExam(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamTests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          id,
          name,
          test_description,
          duration_minutes,
          question_count,
          created_at
        `)
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching exam tests:', error);
    }
  }, [examId]);

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!exam) return <div style={styles.error}>Exam not found</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span onClick={() => navigate('/admin')} style={styles.backButton}>←</span>
        <span style={typography.textLgBold}>Exam Details</span>
      </div>

      <div style={styles.content}>
        <h1 style={typography.displayMdBold}>{exam.exam_name}</h1>
        <p style={{...typography.textMdRegular, color: colors.textSecondary}}>
          {exam.exam_description || 'No description'}
        </p>

        <h2 style={{...typography.textLgBold, marginTop: '32px'}}>Sections</h2>
        <div style={styles.list}>
          {exam.exam_sections?.map(section => (
            <div key={section.id} style={styles.item}>
              <h3 style={typography.textMdBold}>{section.section_name}</h3>
              <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
                {section.section_description || 'No description'}
              </p>
            </div>
          ))}
        </div>

        <h2 style={{...typography.textLgBold, marginTop: '32px'}}>Tests</h2>
        <div style={styles.list}>
          {tests.map(test => (
            <div key={test.id} style={styles.item}>
              <h3 style={typography.textMdBold}>{test.name}</h3>
              <p style={{...typography.textSmRegular, color: colors.textSecondary}}>
                {test.test_description}
              </p>
              <div className="test-info">
                <span>Duration: {test.duration_minutes} min</span>
                <span>Questions: {test.question_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: colors.backgroundPrimary,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  backButton: {
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textPrimary,
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  item: {
    padding: '16px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '8px',
  },
  loading: {
    ...typography.textMdRegular,
    color: colors.textSecondary,
    padding: '16px',
  },
  error: {
    color: colors.accentError,
    padding: '16px',
    ...typography.textMdRegular,
  },
};

export default ExamDetails; 