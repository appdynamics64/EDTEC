import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SSRProvider } from 'react-bootstrap';
import { supabase } from './config/supabaseClient';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Confirmation from './pages/Confirmation';
import ExamSelection from './pages/ExamSelection';
import Dashboard from './pages/Dashboard';
import TestDetails from './pages/TestDetails';
import TestScreen from './pages/TestScreen';
import TestResults from './pages/TestResults';
import AdminConsole from './pages/AdminConsole';
import ExamDetails from './pages/ExamDetails';
import QuestionDetails from './pages/QuestionDetails';
import AuthCallback from './pages/AuthCallback';
import TestsListingPage from './pages/TestsListingPage';
import AdminDebugger from './pages/AdminDebugger';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <SSRProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/exam-selection" element={<ExamSelection />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/tests" 
            element={
              <ProtectedRoute>
                <TestsListingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/test/:testId" 
            element={
              <ProtectedRoute>
                <TestDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/test/:testId/questions" 
            element={
              <ProtectedRoute>
                <TestScreen />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/test/:testId/results/:resultId" 
            element={
              <ProtectedRoute>
                <TestResults />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminConsole />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/exam/:examId" 
            element={
              <ProtectedRoute>
                <ExamDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/question/:questionId" 
            element={
              <ProtectedRoute>
                <QuestionDetails />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/admin/debugger"
            element={
              <ProtectedRoute>
                <AdminDebugger />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to dashboard */}
          <Route 
            path="*" 
            element={<Navigate to="/dashboard" replace />} 
          />
        </Routes>
      </Router>
    </SSRProvider>
  );
}

export default App;
