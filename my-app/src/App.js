import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Confirmation from './pages/Confirmation';
import ExamSelection from './pages/ExamSelection';
import Dashboard from './pages/Dashboard';
import AllTests from './pages/AllTests';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/exam-selection" element={<ExamSelection />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/all-tests" element={<AllTests />} />
      </Routes>
    </Router>
  );
}

export default App;
