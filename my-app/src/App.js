import React, { useState } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Confirmation from './pages/Confirmation';
import ExamSelection from './pages/ExamSelection';
import './App.css';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showExamSelection, setShowExamSelection] = useState(false);

  return (
    <div className="App">
      {showExamSelection ? (
        <ExamSelection setIsLogin={setIsLogin} />
      ) : showConfirmation ? (
        <Confirmation 
          setIsLogin={setIsLogin} 
          setShowConfirmation={setShowConfirmation} 
          setShowExamSelection={setShowExamSelection} 
        />
      ) : isLogin ? (
        <Login setIsLogin={setIsLogin} />
      ) : (
        <Signup 
          setIsLogin={setIsLogin} 
          setShowConfirmation={setShowConfirmation} 
          setShowExamSelection={setShowExamSelection} 
        />
      )}
    </div>
  );
}

export default App;
