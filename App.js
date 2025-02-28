import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AllTests from './pages/AllTests';
import TestDetails from './pages/TestDetails';
import TestScreen from './pages/TestScreen';
import TestResult from './pages/TestResult';
import TestSolution from './pages/TestSolution';
import ExamSelection from './pages/ExamSelection';
import ExamDetails from './pages/ExamDetails';
import Signup from './pages/Signup';
import AdminConsole from './pages/AdminConsole';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExamSelection />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/all-tests" element={<AllTests />} />
        <Route path="/test/:testId" element={<TestDetails />} />
        <Route path="/test/:testId/questions" element={<TestScreen />} />
        <Route path="/test/:testId/result" element={<TestResult />} />
        <Route path="/test/:testId/solutions" element={<TestSolution />} />
        <Route path="/exam/:examId" element={<ExamDetails />} />
        <Route path="/admin" element={<AdminConsole />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App; 