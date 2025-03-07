import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const TestResultRecovery = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState(null);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get the test results from localStorage
    const storedResults = localStorage.getItem('pendingTestResults');
    if (storedResults) {
      setTestResults(JSON.parse(storedResults));
    }
    
    // Fetch the test details
    const fetchTestDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('tests')
          .select('*')
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
    
    fetchTestDetails();
  }, [testId]);
  
  const handleSaveResults = async () => {
    if (!testResults) return;
    
    try {
      setLoading(true);
      
      // Create a new completed test
      const stringId = `recovery-${Date.now()}`;
      const { error } = await supabase
        .from('user_tests')
        .insert({
          id: stringId,
          user_id: testResults.user_id,
          test_id: testResults.test_id || testResults.exam_test_id,
          status: 'completed',
          score: testResults.score,
          total_questions_answered: testResults.total_questions_answered,
          start_time: new Date(new Date(testResults.timestamp).getTime() - 1800000).toISOString(),
          end_time: testResults.timestamp,
          time_taken: 1800
        });
        
      if (error) throw error;
      
      // Clear the localStorage
      localStorage.removeItem('pendingTestResults');
      
      // Navigate to the test result page
      navigate(`/test-result/${testId}?user_test_id=${stringId}`);
    } catch (error) {
      console.error('Error saving results:', error);
      setLoading(false);
      alert('Failed to save results. Please try again or contact support.');
    }
  };
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!testResults) {
    return (
      <div style={styles.container}>
        <h1 style={typography.textXlBold}>Test Results Recovery</h1>
        <div style={styles.errorContainer}>
          <p style={typography.textMdRegular}>
            No test results were found in your browser's storage.
          </p>
          <button 
            style={styles.button}
            onClick={() => navigate(`/test/${testId}`)}
          >
            Return to Test
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <h1 style={typography.textXlBold}>Test Results Recovery</h1>
      <div style={styles.card}>
        <h2 style={typography.textLgBold}>{testData?.title || 'Test'}</h2>
        <p style={typography.textMdRegular}>
          We encountered an issue saving your test results to our database.
          However, we've recovered your results from your browser's storage.
        </p>
        
        <div style={styles.resultsContainer}>
          <div style={styles.resultItem}>
            <span style={typography.textMdRegular}>Score:</span>
            <span style={typography.textMdBold}>{testResults.score} / {testData.question_count}</span>
          </div>
          <div style={styles.resultItem}>
            <span style={typography.textMdRegular}>Questions Answered:</span>
            <span style={typography.textMdBold}>{testResults.total_questions_answered} / {testData.question_count}</span>
          </div>
          <div style={styles.resultItem}>
            <span style={typography.textMdRegular}>Completion Time:</span>
            <span style={typography.textMdBold}>{new Date(testResults.timestamp).toLocaleString()}</span>
          </div>
        </div>
        
        <div style={styles.buttonContainer}>
          <button 
            style={styles.secondaryButton}
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
          <button 
            style={styles.primaryButton}
            onClick={handleSaveResults}
          >
            Save Results
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  // Add your styles here
};

export default TestResultRecovery; 