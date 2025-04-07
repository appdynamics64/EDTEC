import React, { useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';
import { supabase } from './config/supabaseClient';
import useAuth from './hooks/useAuth';
import { routerOptions } from './config/routerConfig';

// Import all components
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ExamSelectionOnboarding from './pages/ExamSelectionOnboarding';
import LoadingScreen from './components/LoadingScreen';
import TestDetails from './pages/TestDetails';
import TestScreen from './pages/TestScreen';
import TestSolution from './pages/TestSolution';
import AdminConsole from './pages/AdminConsole';
import PrivateRoute from './components/PrivateRoute';
import Chatbot from './pages/Chatbot';
import Leaderboard from './pages/Leaderboard';

function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [initializing, setInitializing] = React.useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = React.useState(false);
  const [initialRoute, setInitialRoute] = React.useState(null);
  const [router, setRouter] = React.useState(null);

  // Instead, use a ref to ensure it only runs once
  const supabaseInitialized = useRef(false);

  useEffect(() => {
    if (supabaseInitialized.current) return;
    
    console.log('Checking Supabase session in App component (once)');
    const checkSession = async () => {
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
    supabaseInitialized.current = true;
  }, []);

  React.useEffect(() => {
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

  // Create router after we have the user and onboarding status
  React.useEffect(() => {
    if (initializing || !initialRoute) return;

    // Create the router with the current state
    const newRouter = createBrowserRouter([
      {
        path: "/login",
        element: <Login />
      },
      {
        path: "/signup",
        element: <Signup />
      },
      {
        path: "/",
        element: <PrivateRoute><Dashboard /></PrivateRoute>
      },
      {
        path: "/test/:testId",
        element: <PrivateRoute><TestScreen /></PrivateRoute>
      },
      {
        path: "/test-details/:testId",
        element: <PrivateRoute><TestDetails /></PrivateRoute>
      },
      {
        path: "/test/:testId/take",
        element: <PrivateRoute><TestScreen /></PrivateRoute>
      },
      {
        path: "/reset-password",
        element: <ResetPassword />
      },
      {
        path: "/onboarding",
        element: !user ? (
          <Navigate to="/login" replace />
        ) : isOnboardingComplete ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <ExamSelectionOnboarding />
        )
      },
      {
        path: "/dashboard",
        element: !user ? (
          <Navigate to="/login" replace />
        ) : !isOnboardingComplete ? (
          <Navigate to="/onboarding" replace />
        ) : (
          <Dashboard />
        )
      },
      {
        path: "/admin",
        element: <PrivateRoute><AdminConsole /></PrivateRoute>
      },
      {
        path: "/test-solution/:testId/:attemptId",
        element: <PrivateRoute><TestSolution /></PrivateRoute>
      },
      {
        path: "/chatbot",
        element: <PrivateRoute><Chatbot /></PrivateRoute>
      },
      {
        path: "/leaderboard",
        element: <PrivateRoute><Leaderboard /></PrivateRoute>
      },
      {
        path: "*",
        element: <Navigate to={initialRoute} replace />
      }
    ], routerOptions);

    setRouter(newRouter);
  }, [user, isOnboardingComplete, initialRoute, initializing]);

  // Show loading screen until auth is checked and initial route is determined
  if (authLoading || initializing || !initialRoute || !router) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} />;
}

export default App;
