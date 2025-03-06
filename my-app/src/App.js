import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
<<<<<<< HEAD
import { SSRProvider } from 'react-bootstrap';
=======
import { supabase } from './config/supabaseClient';
>>>>>>> 768f45e5b78e8b478bbf3c495fac57468ebdd7dc
import Login from './pages/Login';
import Signup from './pages/Signup';
import Confirmation from './pages/Confirmation';
import ExamSelection from './pages/ExamSelection';
import Dashboard from './pages/Dashboard';
import AllTests from './pages/AllTests';
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
import PrivateRoute from './components/PrivateRoute';
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
<<<<<<< HEAD
    <SSRProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/exam-selection" element={<ExamSelection />} />
          
          {/* Protected Routes */}
          <Route 
            path="/tests" 
            element={
              <PrivateRoute>
                <AllTests />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/test/:testId" 
            element={
              <PrivateRoute>
                <TestDetails />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/test/:testId/questions" 
            element={
              <PrivateRoute>
                <TestScreen />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/test/:testId/results/:resultId" 
            element={
              <PrivateRoute>
                <TestResults />
              </PrivateRoute>
            } 
          />

          {/* Redirect root to /tests */}
          <Route 
            path="/" 
            element={<Navigate to="/tests" replace />} 
          />

          {/* Catch all route - redirect to /tests */}
          <Route 
            path="*" 
            element={<Navigate to="/tests" replace />} 
          />

          {/* App routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/admin/exam/:examId" element={<ExamDetails />} />
          <Route path="/admin/question/:questionId" element={<QuestionDetails />} />
        </Routes>
      </Router>
    </SSRProvider>
=======
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
>>>>>>> 768f45e5b78e8b478bbf3c495fac57468ebdd7dc
  );
}

export default App;
