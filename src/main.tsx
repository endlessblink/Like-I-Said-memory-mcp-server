import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/fab.css'
import { initializeThemeSystem } from './utils/theme-fix'
import { ThemeProvider } from './components/ThemeProvider'
import Alpine from 'alpinejs'

// Initialize Alpine.js
declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

window.Alpine = Alpine;
Alpine.start();

// Initialize theme before React renders
initializeThemeSystem();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
