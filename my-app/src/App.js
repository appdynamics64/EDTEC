import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Confirmation from './pages/Confirmation';
import ExamSelection from './pages/ExamSelection';
import Dashboard from './pages/Dashboard';
import AllTests from './pages/AllTests';
import TestDetails from './pages/TestDetails';
import TestScreen from './pages/TestScreen';
import TestResult from './pages/TestResult';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/exam-selection" element={<ExamSelection />} />
        
        {/* App routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/all-tests" element={<AllTests />} />
        <Route path="/test/:testId" element={<TestDetails />} />
        <Route path="/test/:testId/questions" element={<TestScreen />} />
        <Route path="/test/:testId/result" element={<TestResult />} />
      </Routes>
    </Router>
  );
}

export default App;
