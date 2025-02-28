import React from 'react';
import colors from '../styles/foundation/colors';

const YourComponent = () => {
  return (
    <div style={{ backgroundColor: colors.backgroundPrimary }}>
      <h1 style={{ color: colors.brandPrimary }}>Hello World</h1>
      <p style={{ color: colors.textPrimary }}>This is a sample text using Rubik font.</p>
    </div>
  );
};

export default YourComponent; 