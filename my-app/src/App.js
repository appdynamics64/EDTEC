import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SSRProvider } from 'react-bootstrap';
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
import './App.css';
import PrivateRoute from './components/PrivateRoute';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
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
  );
}

export default App;
