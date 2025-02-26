import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const QuestionDetails = () => {
  const navigate = useNavigate();
  const { questionId } = useParams();
  const location = useLocation();
  const [question, setQuestion] = useState(location.state?.questionData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!question) {
      fetchQuestionDetails();
    } else {
      setLoading(false);
    }
  }, [questionId]);

  const fetchQuestionDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          exam:exams (
            exam_name,
            exam_description
          ),
          section:exam_sections (
            section_name,
            section_description
          )
        `)
        .eq('id', questionId)
        .single();

      if (error) throw error;
      setQuestion(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!question) return <div style={styles.error}>Question not found</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span onClick={() => navigate('/admin')} style={styles.backButton}>←</span>
        <span style={typography.textLgBold}>Question Details</span>
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={typography.textLgBold}>Question</h2>
          <div style={styles.item}>
            <p style={typography.textMdRegular}>{question.question_text}</p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={typography.textLgBold}>Details</h2>
          <div style={styles.item}>
            <p style={typography.textMdRegular}>
              <strong>Type:</strong> {question.question_type}
            </p>
            <p style={typography.textMdRegular}>
              <strong>Difficulty:</strong> {question.difficulty}
            </p>
            <p style={typography.textMdRegular}>
              <strong>Exam:</strong> {question.exam?.exam_name}
            </p>
            <p style={typography.textMdRegular}>
              <strong>Section:</strong> {question.section?.section_name}
            </p>
          </div>
        </div>

        {question.choices && (
          <div style={styles.section}>
            <h2 style={typography.textLgBold}>Choices</h2>
            <div style={styles.item}>
              {Object.entries(question.choices).map(([key, value]) => (
                <p key={key} style={typography.textMdRegular}>
                  {key}: {value}
                </p>
              ))}
            </div>
          </div>
        )}

        <div style={styles.section}>
          <h2 style={typography.textLgBold}>Correct Answer</h2>
          <div style={styles.item}>
            <p style={typography.textMdRegular}>
              {JSON.stringify(question.correct_answer)}
            </p>
          </div>
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
  section: {
    marginBottom: '24px',
  },
  item: {
    padding: '16px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '8px',
    marginTop: '8px',
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

export default QuestionDetails; 