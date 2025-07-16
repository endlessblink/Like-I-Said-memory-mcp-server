import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeThemeSystem } from './utils/theme-fix'
import { ThemeProvider } from './components/ThemeProvider'

// Initialize theme before React renders
initializeThemeSystem();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
