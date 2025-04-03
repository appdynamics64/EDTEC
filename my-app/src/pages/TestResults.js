import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testService } from '../services/api/testService';
import useAuth from '../hooks/useAuth';
import { supabase } from '../config/supabaseClient';

function TestResults() {
  const { testId, resultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testDetails, setTestDetails] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [totalXP, setTotalXP] = useState(0);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const result = await testService.getTestResults(resultId);
      setTestResult(result);
      setTestDetails(result.test);
      setUserAnswers(result.answers);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  const fetchTestResults = useCallback(async () => {
    try {
      console.debug('Fetching test results for:', { resultId });
      
      const { data, error } = await supabase
        .from('user_tests')
        .select(`
          id,
          status,
          score,
          total_questions,
          time_taken,
          created_at,
          start_time,
          end_time,
          answers,
          test:test_id (
            id,
            name,
            test_description,
            duration_minutes,
            question_count,
            exam:exam_id (
              exam_name,
              exam_description
            )
          )
        `)
        .eq('id', resultId)
        .single();

      if (error) {
        console.error('Supabase error fetching test results:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        throw error;
      }

      console.debug('Fetched test results:', data);
      
      setTestResult(data);
      setTestDetails(data.test);
      setUserAnswers(data.answers || []);
      
    } catch (error) {
      console.error('Error fetching test results:', error);
      setError('Failed to load test results');
    }
  }, [resultId]);

  const calculateXP = (score) => {
    // Simple XP calculation based on score
    return Math.round(score);
  };

  const updateXP = useCallback(async (score) => {
    try {
      const xpEarned = calculateXP(score);

      // Update xp_transactions table
      const { error: xpError } = await supabase
        .from('xp_transactions')
        .insert({
          user_id: user.id,
          source: 'test_completed',
          test_id: testId,
          xp_earned: xpEarned,
        });

      if (xpError) throw xpError;

      // Update profiles table
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const newTotalXP = data.total_xp + xpEarned;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_xp: newTotalXP })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setTotalXP(newTotalXP);
    } catch (error) {
      console.error('Error updating XP:', error);
      setError('Failed to update XP');
    }
  }, [testId]);

  useEffect(() => {
    fetchTestResults();
  }, [fetchTestResults]);

  useEffect(() => {
    if (testResult && testResult.score) {
      updateXP(testResult.score);
    }
  }, [testResult, updateXP]);

  const handleRetakeTest = async () => {
    try {
      if (!user) {
        navigate('/login');
        return;
      }

      // Create a new test attempt
      const { error } = await testService.createUserTest(testId, user.id);

      if (error) throw error;

      // Navigate to the test
      navigate(`/test/${testId}`);
    } catch (error) {
      console.error('Error starting new test:', error);
      alert('Failed to start new test. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container p-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading test results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container p-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Results</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">Please try refreshing the page or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

  if (!testResult || !testDetails) {
    return (
      <div className="container p-4">
        <div className="alert alert-warning">
          <h4 className="alert-heading">No Results Found</h4>
          <p>Could not find the test results you're looking for.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-4">
      <div className="card mb-4">
        <div className="card-header">
          <h4>Test Results</h4>
        </div>
        <div className="card-body">
          <h5 className="card-title">
            {testDetails?.exam?.exam_name}: {testDetails?.name}
          </h5>
          
          <div className="d-flex justify-content-between my-4">
            <div>
              <p>
                <strong>Score:</strong> {testResult?.score ? (
                  <span className={`badge ${testResult.score >= 70 ? 'bg-success' : 'bg-danger'}`}>
                    {testResult.score.toFixed(1)}%
                  </span>
                ) : 'Not calculated'}
              </p>
              <p>
                <strong>Questions Answered:</strong> {testResult?.total_questions_answered || 0} / {testDetails?.question_count}
              </p>
              <p>
                <strong>Correct Answers:</strong> {userAnswers.filter(a => a.is_correct).length} / {userAnswers.length}
              </p>
              <p>
                <strong>Total XP:</strong> {totalXP}
              </p>
            </div>
            <div>
              <p>
                <strong>Time Taken:</strong> {testResult?.time_taken ? `${testResult.time_taken} minutes` : 'N/A'}
              </p>
              <p>
                <strong>Status:</strong> <span className="badge bg-primary">{testResult?.status}</span>
              </p>
            </div>
          </div>

          <div className="d-flex justify-content-between mt-4">
            <button className="btn btn-primary" onClick={handleRetakeTest}>
              Retake Test
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/tests')}>
              View All Tests
            </button>
          </div>
        </div>
      </div>

      <h4 className="mb-3">Question Review</h4>
      {userAnswers.map((answer, index) => (
        <div key={index} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">Question {index + 1}</h5>
            <p>{answer.question?.question_text}</p>
            
            <div className="list-group">
              {Object.entries(answer.question?.choices || {}).map(([key, value]) => (
                <div
                  key={key}
                  className={`list-group-item ${
                    answer.selected_answer === key
                      ? answer.is_correct
                        ? "list-group-item-success"
                        : "list-group-item-danger"
                      : answer.question?.correct_answer?.[0] === key
                      ? "list-group-item-success"
                      : ""
                  }`}
                >
                  {key}: {value}
                  {answer.selected_answer === key && (
                    <span className="badge bg-primary ms-2">Your Answer</span>
                  )}
                  {answer.question?.correct_answer?.[0] === key && (
                    <span className="badge bg-success ms-2">Correct Answer</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TestResults; 