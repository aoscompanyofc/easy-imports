import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/liquid-glass.css'

// Apply saved theme before first render to prevent flash of wrong theme.
// Padrão = Liquid Glass imersivo (dark) quando não há preferência salva.
try {
  const saved = localStorage.getItem('easy-imports-theme');
  let dark = true; // padrão imersivo Apple
  if (saved) {
    const { state } = JSON.parse(saved);
    if (typeof state?.isDark === 'boolean') dark = state.isDark;
  }
  if (dark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.add('liquid-glass-theme');
  }
} catch {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
