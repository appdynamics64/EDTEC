import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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
import ResetPassword from './pages/ResetPassword';
import ExamSelectionOnboarding from './pages/ExamSelectionOnboarding';
import './App.css';
import './styles/global.css';
import './styles/components.css';
import './styles/variables.css';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const ErrorPage = () => {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      fontFamily: 'system-ui' 
    }}>
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <button onClick={() => window.location.href = '/'}>
        Go to Home
      </button>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <ErrorPage />
  },
  {
    path: '/login',
    element: <Login />,
    errorElement: <ErrorPage />
  },
  {
    path: '/signup',
    element: <Signup />,
    errorElement: <ErrorPage />
  },
  {
    path: '/confirmation',
    element: <Confirmation />,
    errorElement: <ErrorPage />
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
    errorElement: <ErrorPage />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
    errorElement: <ErrorPage />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'dashboard',
        element: (
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        )
      },
      {
        path: 'exams',
        element: <ExamSelectionOnboarding />
      },
      {
        path: 'exam/:examId',
        element: <ExamDetails />
      },
      {
        path: 'exam/:examId/tests',
        element: <TestsListingPage />
      },
      {
        path: 'test/:testId',
        element: <TestDetails />
      },
      {
        path: 'test/:testId/questions',
        element: <TestScreen />
      },
      {
        path: 'test/:testId/results/:resultId',
        element: <TestResults />
      },
      {
        path: 'tests',
        element: <TestsListingPage />
      },
      {
        path: 'admin',
        element: <AdminConsole />
      },
      {
        path: 'admin/question/:questionId',
        element: <QuestionDetails />
      },
      {
        path: 'admin/debugger',
        element: <AdminDebugger />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <ErrorPage />
  }
]);

function App() {
  return (
    <RouterProvider 
      router={router} 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }} 
    />
  );
}

export default App;
