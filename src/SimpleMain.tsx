import React from 'react'
import ReactDOM from 'react-dom/client'

function SimpleApp() {
  return (
    <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: 'blue' }}>React is Working!</h1>
      <p>If you can see this, React is mounting correctly.</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<SimpleApp />)