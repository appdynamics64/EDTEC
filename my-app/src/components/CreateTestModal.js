import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const CreateTestModal = ({ isOpen, onClose, type }) => {
  const [formData, setFormData] = useState({
    testName: '',
    duration: '',
    totalQuestions: '',
    selectedTopics: [],
    difficulty: 'mixed', // easy, medium, hard, mixed
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topics, setTopics] = useState([]);
  const [availableQuestionCount, setAvailableQuestionCount] = useState(0);

  // Fetch topics when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTopics();
    }
  }, [isOpen]);

  // Add effect to check available questions when criteria changes
  useEffect(() => {
    if (formData.selectedTopics.length > 0) {
      checkAvailableQuestions();
    }
  }, [formData.selectedTopics, formData.difficulty]);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('topic')
        .not('topic', 'is', null);

      if (error) throw error;

      // Get unique topics
      const uniqueTopics = [...new Set(data.map(q => q.topic))];
      setTopics(uniqueTopics);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const checkAvailableQuestions = async () => {
    try {
      if (formData.selectedTopics.length === 0) {
        setAvailableQuestionCount(0);
        return;
      }

      let query = supabase
        .from('questions')
        .select('*', { count: 'exact' })
        .in('topic', formData.selectedTopics);

      if (formData.difficulty !== 'mixed') {
        query = query.eq('difficulty', formData.difficulty);
      }

      const { count, error } = await query;
      
      if (error) throw error;
      setAvailableQuestionCount(count || 0);
    } catch (error) {
      console.error('Error checking available questions:', error);
      setAvailableQuestionCount(0);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's selected exam
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('selected_exam')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Get exam id for the selected exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id')
        .eq('exam_name', userData.selected_exam)
        .single();

      if (examError) throw examError;

      // Check available questions with proper auth
      let query = supabase
        .from('questions')
        .select('id, question_text, choices, correct_answer, difficulty, topic')
        .eq('exam_id', examData.id)
        .eq('is_active', true)
        .in('topic', formData.selectedTopics);

      if (formData.difficulty !== 'mixed') {
        query = query.eq('difficulty', formData.difficulty);
      }

      const { data: availableQuestions, error: countError } = await query;
      
      if (countError) throw countError;

      if (!availableQuestions || availableQuestions.length < parseInt(formData.totalQuestions)) {
        throw new Error(`Only ${availableQuestions?.length || 0} questions available. Please reduce the number of questions or select different criteria.`);
      }

      // Create test record (authenticated users can do this per policy)
      const { data: test, error: testError } = await supabase
        .from('exam_tests')
        .insert({
          exam_id: examData.id,
          test_name: formData.testName,
          duration: parseInt(formData.duration),
          total_questions: parseInt(formData.totalQuestions),
          type: type === 'random' ? 'recommended' : 'custom',
          created_by: user.id,
          topics: formData.selectedTopics,
          difficulty: formData.difficulty,
          is_active: true
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create user_test record (with user_id matching auth.uid())
      const { data: userTest, error: userTestError } = await supabase
        .from('user_tests')
        .insert({
          user_id: user.id, // Must match auth.uid() per policy
          exam_test_id: test.id,
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (userTestError) throw userTestError;

      if (type === 'random') {
        // Randomly select questions
        const selectedQuestions = availableQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, parseInt(formData.totalQuestions));

        // Create exam_test_questions (authenticated users can do this per policy)
        const { error: linkError } = await supabase
          .from('exam_test_questions')
          .insert(
            selectedQuestions.map((q, index) => ({
              exam_test_id: test.id,
              question_id: q.id,
              question_order: index + 1
            }))
          );

        if (linkError) throw linkError;

        // Create user_test_questions (must be associated with user's test)
        const { error: userTestQuestionsError } = await supabase
          .from('user_test_questions')
          .insert(
            selectedQuestions.map(q => ({
              user_test_id: userTest.id, // Must be from user's own test per policy
              question_id: q.id,
              marks_awarded: 0,
              time_spent: 0
            }))
          );

        if (userTestQuestionsError) throw userTestQuestionsError;
      }

      onClose();
    } catch (error) {
      console.error('Error creating test:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={typography.textLgBold}>
            Create {type === 'random' ? 'Random' : 'Custom'} Test
          </h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Test Name</label>
            <input
              type="text"
              value={formData.testName}
              onChange={(e) => setFormData({...formData, testName: e.target.value})}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
              style={styles.input}
              required
              min="1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Number of Questions</label>
            <input
              type="number"
              value={formData.totalQuestions}
              onChange={(e) => setFormData({...formData, totalQuestions: e.target.value})}
              style={styles.input}
              required
              min="1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Topics</label>
            <div style={styles.topicsGrid}>
              {topics.map(topic => (
                <label key={topic} style={styles.topicLabel}>
                  <input
                    type="checkbox"
                    checked={formData.selectedTopics.includes(topic)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          selectedTopics: [...formData.selectedTopics, topic]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          selectedTopics: formData.selectedTopics.filter(t => t !== topic)
                        });
                      }
                    }}
                  />
                  {topic}
                </label>
              ))}
            </div>
          </div>

          {formData.selectedTopics.length > 0 && (
            <div style={styles.info}>
              <span style={typography.textSmRegular}>
                Available questions: {availableQuestionCount}
              </span>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
              style={styles.input}
            >
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
  },
  modal: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textSecondary,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: colors.textPrimary,
    ...typography.textSmMedium,
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${colors.textSecondary}`,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    ...typography.textMdRegular,
  },
  topicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  },
  topicLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: colors.textPrimary,
    ...typography.textSmRegular,
  },
  error: {
    color: colors.accentError,
    ...typography.textSmRegular,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${colors.textSecondary}`,
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    cursor: 'pointer',
    ...typography.textMdBold,
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    cursor: 'pointer',
    ...typography.textMdBold,
  },
  info: {
    padding: '8px 12px',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: '8px',
    color: colors.textSecondary,
    marginTop: '8px',
  },
};

export default CreateTestModal; 