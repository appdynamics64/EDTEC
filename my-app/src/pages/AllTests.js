import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

function AllTests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    console.log('Component mounted');
    fetchTests();
  }, []);

  async function fetchTests() {
    try {
      setLoading(true);
      console.log('Starting to fetch tests...');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      if (userError) {
        console.error('User error:', userError);
        throw userError;
      }

      // Fetch tests with only existing columns
      const { data: tests, error: testsError } = await supabase
        .from('exam_tests')
        .select(`
          id,
          test_name,
          total_questions,
          duration,
          is_active,
          exam:exam_id (
            exam_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('Raw tests data:', tests);

      if (testsError) {
        console.error('Error fetching tests:', testsError);
        throw testsError;
      }

      setTests(tests || []);
      console.log('Tests state updated');

    } catch (err) {
      console.error('Error in fetchTests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Loading finished');
    }
  }

  const handleViewTest = (testId) => {
    console.log('Navigating to test:', testId);
    navigate(`/test/${testId}`);
  };

  if (loading) {
    return (
      <div className="container p-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading tests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container p-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Tests</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">Please try refreshing the page or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-4">
      <h1 className="mb-4">Available Tests</h1>
      
      {tests.length === 0 ? (
        <div className="alert alert-info">
          <h4 className="alert-heading">No Tests Available</h4>
          <p>There are currently no active tests available. Please check back later.</p>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {tests.map(test => (
            <div key={test.id} className="col">
              <div className="card h-100">
                <div className="card-header">
                  <span className="badge bg-secondary">
                    {test.exam?.exam_name || "No Exam"}
                  </span>
                </div>
                <div className="card-body">
                  <h5 className="card-title">{test.test_name || "Unnamed Test"}</h5>
                  <div className="card-text">
                    <p className="mb-1">
                      <strong>Questions:</strong> {test.total_questions || "N/A"}
                    </p>
                    <p className="mb-1">
                      <strong>Duration:</strong> {test.duration ? `${test.duration} minutes` : "N/A"}
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary mt-3"
                    onClick={() => handleViewTest(test.id)}
                  >
                    View Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AllTests; 