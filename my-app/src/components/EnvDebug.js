import React from 'react';

const EnvDebug = () => {
  return (
    <div style={{ margin: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
      <h3>Environment Variables</h3>
      <p>API URL: {process.env.REACT_APP_API_URL || 'Not set'}</p>
      <p>Supabase URL: {process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not set'}</p>
    </div>
  );
};

export default EnvDebug; 