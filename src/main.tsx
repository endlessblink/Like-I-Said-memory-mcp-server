import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SimpleApp from './SimpleApp'
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

// Temporarily disable simple dashboard (broken UI)
// const useSimpleDashboard = new URLSearchParams(window.location.search).has('simple') || 
//                           window.location.pathname.includes('simple') ||
//                           localStorage.getItem('dashboard-mode') === 'simple';

const AppComponent = App; // Always use original working dashboard

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppComponent />
    </ThemeProvider>
  </React.StrictMode>
)
