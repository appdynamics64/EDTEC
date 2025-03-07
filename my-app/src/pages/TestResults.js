import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function TestResults() {
  const { testId, resultId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testDetails, setTestDetails] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const fetchResults = async () => {
    try {
      setLoading(true);

      // 1. Get test result details
      const { data: result, error: resultError } = await supabase
        .from('user_tests')
        .select(`
          *,
          exam_test:exam_test_id (
            test_name,
            total_questions,
            exam:exam_id (
              exam_name
            )
          )
        `)
        .eq('id', resultId)
        .single();

      if (resultError) throw resultError;

      // 2. Get user's answers
      const { data: answers, error: answersError } = await supabase
        .from('user_test_questions')
        .select(`
          *,
          question:question_id (
            question_text,
            choices,
            correct_answer
          )
        `)
        .eq('user_test_id', resultId);

      if (answersError) throw answersError;

      // 3. Calculate score if not already set
      if (!result.score || result.score === 0) {
        const totalAnswered = answers.length;
        const correctAnswers = answers.filter(a => a.is_correct).length;
        const scorePercentage = (correctAnswers / result.exam_test.total_questions) * 100;

        // Update the score
        const { error: updateError } = await supabase
          .from('user_tests')
          .update({ 
            score: scorePercentage,
            total_questions_answered: totalAnswered,
            status: 'completed'
          })
          .eq('id', resultId);

        if (updateError) throw updateError;
        
        result.score = scorePercentage;
        result.total_questions_answered = totalAnswered;
        result.status = 'completed';
      }

      setTestResult(result);
      setTestDetails(result.exam_test);
      setUserAnswers(answers);
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetakeTest = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      console.log('Starting new test attempt...', { testId, userId: user.id });

      // Create a new test attempt
      const { data: newTest, error: createError } = await supabase
        .from('user_tests')
        .insert([{
          exam_test_id: testId,
          user_id: user.id,
          status: 'in_progress',
          start_time: new Date().toISOString(),
          score: 0,
          total_questions_answered: 0,
          time_taken: 0,
          end_time: null
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating new test:', createError);
        throw createError;
      }

      console.log('New test created:', newTest);

      // Navigate to the new test
      navigate(`/test/${testId}/questions`);
      
    } catch (error) {
      console.error('Error starting new test:', error);
      alert(`Failed to start new test: ${error.message}`);
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
            {testDetails?.exam?.exam_name}: {testDetails?.test_name}
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
                <strong>Questions Answered:</strong> {testResult?.total_questions_answered || 0} / {testDetails?.total_questions}
              </p>
              <p>
                <strong>Correct Answers:</strong> {userAnswers.filter(a => a.is_correct).length} / {userAnswers.length}
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