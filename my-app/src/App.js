import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabaseClient';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Confirmation from './pages/Confirmation';
import ExamSelection from './pages/ExamSelection';
import Dashboard from './pages/Dashboard';
import AllTests from './pages/AllTests';
import TestDetails from './pages/TestDetails';
import TestScreen from './pages/TestScreen';
import TestResult from './pages/TestResult';
import AdminConsole from './pages/AdminConsole';
import ExamDetails from './pages/ExamDetails';
import QuestionDetails from './pages/QuestionDetails';
import AuthCallback from './pages/AuthCallback';
import TestsListingPage from './pages/TestsListingPage';
import AdminDebugger from './pages/AdminDebugger';
import './App.css';

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
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/exam-selection" element={<ExamSelection />} />
        
        {/* Protected routes */}
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
        <Route path="/test/:testId" element={<TestDetails />} />
        <Route path="/test/:testId/questions" element={<TestScreen />} />
        <Route path="/test-result/:testId" element={<TestResult />} />
        <Route path="/admin" element={<AdminConsole />} />
        <Route path="/admin/exam/:examId" element={<ExamDetails />} />
        <Route path="/admin/question/:questionId" element={<QuestionDetails />} />
        <Route
          path="/admin/debugger"
          element={
            <ProtectedRoute>
              <AdminDebugger />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect root to dashboard or login */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        
        {/* 404 route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
