import React, { useState } from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm, itemName }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <h2 style={typography.textLgBold}>Confirm Delete</h2>
        <p style={typography.textMdRegular}>
          Are you sure you want to delete: {itemName}?
        </p>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.buttons}>
          <button 
            onClick={onClose}
            style={styles.cancelButton}
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(password)}
            style={styles.deleteButton}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  // ... styles for the dialog ...
};

export default DeleteConfirmDialog; 