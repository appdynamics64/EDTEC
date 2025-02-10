import React, { useState } from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

const ExamSelection = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        navigate('/login');
        return;
      }

      // Update user record with name and selected exam
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: name,
          selected_exam: selectedExam
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving user details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={typography.displayMdBold}>Welcome!</h1>
      <p style={typography.textLgRegular}>Let's get to know you better</p>

      {error && (
        <p style={styles.error}>{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          style={styles.select}
          required
        >
          <option value="">Select your exam</option>
          <option value="SSC CHSL">SSC CHSL</option>
          <option value="Bank PO">Bank PO</option>
          <option value="NDA">NDA</option>
          <option value="SSC GD">SSC GD</option>
        </select>
        <button 
          style={styles.button}
          disabled={loading || !name || !selectedExam}
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </form>
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
  error: {
    color: colors.error,
    margin: '10px 0',
  },
  select: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
};

export default ExamSelection; 