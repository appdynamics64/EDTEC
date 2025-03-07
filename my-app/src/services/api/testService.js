import { supabase } from '../../config/supabaseClient';

export const testService = {
  // Test Management
  async getTest(testId) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          exam:exam_id (
            name,
            description,
            category:category_id (
              name
            )
          ),
          questions:test_questions (
            question:question_id (
              *
            )
          )
        `)
        .eq('id', testId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching test:', error);
      throw error;
    }
  },

  // User Test Management
  async createUserTest(testId, userId) {
    if (!testId || !userId) {
      throw new Error('testId and userId are required');
    }

    try {
      const { data, error } = await supabase
        .from('user_tests')
        .insert([{
          test_id: testId,
          user_id: userId,
          status: 'in_progress',
          start_time: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user test:', error);
      throw error;
    }
  },

  // Test Results
  async getTestResults(resultId) {
    if (!resultId) {
      throw new Error('resultId is required');
    }

    try {
      const { data, error } = await supabase
        .from('user_tests')
        .select(`
          *,
          test:test_id (
            title,
            question_count,
            exam:exam_id (
              exam_name
            )
          ),
          answers:user_test_questions (
            *,
            question:question_id (
              question_text,
              choices,
              correct_answer
            )
          )
        `)
        .eq('id', resultId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching test results:', error);
      throw error;
    }
  }
}; 