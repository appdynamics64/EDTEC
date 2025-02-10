import React, { useState } from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const ExamSelection = ({ setIsLogin }) => {
  const [name, setName] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  const handleConfirm = () => {
    // Handle the confirmation logic here
    console.log(`Name: ${name}, Selected Exam: ${selectedExam}`);
    // You can navigate to another page or show a success message
  };

  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Your name</h1>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
      />
      <h2 style={typography.textLgRegular}>Choose exam</h2>
      <div>
        <label>
          <input
            type="radio"
            value="SSC CHSL"
            checked={selectedExam === 'SSC CHSL'}
            onChange={(e) => setSelectedExam(e.target.value)}
          />
          SSC CHSL
        </label>
        <label>
          <input
            type="radio"
            value="Bank PO"
            checked={selectedExam === 'Bank PO'}
            onChange={(e) => setSelectedExam(e.target.value)}
          />
          Bank PO
        </label>
        <label>
          <input
            type="radio"
            value="NDA"
            checked={selectedExam === 'NDA'}
            onChange={(e) => setSelectedExam(e.target.value)}
          />
          NDA
        </label>
        <label>
          <input
            type="radio"
            value="SSC GD"
            checked={selectedExam === 'SSC GD'}
            onChange={(e) => setSelectedExam(e.target.value)}
          />
          SSC GD
        </label>
      </div>
      <button style={styles.button} onClick={handleConfirm}>Confirm</button>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: colors.brandPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default ExamSelection; 