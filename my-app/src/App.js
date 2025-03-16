import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabaseClient';
import useAuth from './hooks/useAuth';

// Import all components
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ExamSelectionOnboarding from './pages/ExamSelectionOnboarding';
import LoadingScreen from './components/LoadingScreen';
import TestDetails from './pages/TestDetails';
import TestScreen from './pages/TestScreen';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkInitialState = async () => {
      try {
        // Wait for auth to be checked
        if (authLoading) return;

        // If no user after auth check, redirect to login
        if (!user) {
          setInitialRoute('/login');
          setInitializing(false);
          return;
        }

        // Check profile status
        const { data, error } = await supabase
          .from('profiles')
          .select('name, selected_exam_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        const hasProfile = Boolean(data?.name && data?.selected_exam_id);
        setIsOnboardingComplete(hasProfile);
        setInitialRoute(hasProfile ? '/dashboard' : '/onboarding');
      } catch (error) {
        console.error('Error checking initial state:', error);
        setInitialRoute('/login');
      } finally {
        setInitializing(false);
      }
    };

    checkInitialState();
  }, [user, authLoading]);

  // Show loading screen until auth is checked and initial route is determined
  if (authLoading || initializing || !initialRoute) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/test/:testId" element={<PrivateRoute><TestScreen /></PrivateRoute>} />
        <Route path="/test-details/:testId" element={<PrivateRoute><TestDetails /></PrivateRoute>} />
        <Route path="/test/:testId/take" element={<PrivateRoute><TestScreen /></PrivateRoute>} />

        {/* Public routes */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route 
          path="/onboarding" 
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : isOnboardingComplete ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <ExamSelectionOnboarding />
            )
          }
        />
        
        <Route 
          path="/dashboard" 
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !isOnboardingComplete ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <Dashboard />
            )
          }
        />

        {/* Default route */}
        <Route 
          path="*" 
          element={<Navigate to={initialRoute} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
