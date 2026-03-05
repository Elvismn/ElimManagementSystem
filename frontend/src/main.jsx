import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Add any providers here if needed in the future
// For example: ThemeProvider, AuthProvider, etc.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)