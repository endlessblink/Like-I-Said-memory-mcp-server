import React from 'react';

function AppTest() {
  console.log('AppTest component is rendering');
  
  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>Dashboard Test - React is Working!</h1>
      <p>If you can see this, React is mounting correctly.</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

export default AppTest;