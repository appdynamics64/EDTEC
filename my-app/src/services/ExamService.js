import { supabase } from '../config/supabaseClient';

/**
 * Fetches available exams from the database
 * @returns {Promise<{data: Array, error: Error}>}
 */
export const fetchAvailableExams = async () => {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('id, exam_name, exam_description, created_at, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform data to include an icon
    const formattedData = data.map(exam => ({
      id: exam.id,
      name: exam.exam_name,
      description: exam.exam_description || '',
      icon: '📚'  // Default icon
    }));
    
    return { data: formattedData, error: null };
  } catch (error) {
    console.error('Error fetching exams:', error);
    return { data: null, error };
  }
};

/**
 * Updates a user's preferred exam
 * @param {string} userId - The user's ID
 * @param {string} examId - The exam ID to set as preferred
 * @param {boolean} completeOnboarding - Whether to mark onboarding as completed
 * @returns {Promise<{error: Error}>}
 */
export const updateUserExam = async (userId, examId, completeOnboarding = false) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        preferred_exam_id: examId,
        onboarding_completed: completeOnboarding,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating user exam:', error);
    return { error };
  }
};

/**
 * Marks onboarding as completed without setting a preferred exam
 * @param {string} userId - The user's ID
 * @returns {Promise<{error: Error}>}
 */
export const skipExamSelection = async (userId) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error skipping exam selection:', error);
    return { error };
  }
};

/**
 * Gets exam details by ID
 * @param {string} examId - The exam ID
 * @returns {Promise<{data: Object, error: Error}>}
 */
export const getExamById = async (examId) => {
  try {
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
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching exam details:', error);
    return { data: null, error };
  }
}; 