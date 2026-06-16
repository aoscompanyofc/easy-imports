import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply saved theme before first render to prevent flash of wrong theme.
try {
  const saved = localStorage.getItem('easy-imports-theme');
  let dark = true;
  if (saved) {
    const { state } = JSON.parse(saved);
    if (typeof state?.isDark === 'boolean') dark = state.isDark;
  }
  if (dark) {
    document.documentElement.classList.add('dark');
  }
} catch {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
