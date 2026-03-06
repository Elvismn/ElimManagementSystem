import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) return savedTheme
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    
    // Remove all theme classes first
    root.classList.remove('light', 'dark')
    
    // Add current theme class
    root.classList.add(theme)
    
    // Set data-theme attribute for better CSS targeting
    root.setAttribute('data-theme', theme)
    
    // Add custom CSS variables for better contrast
    if (theme === 'light') {
      document.body.style.setProperty('--text-primary', '#111827')
      document.body.style.setProperty('--text-secondary', '#4b5563')
      document.body.style.setProperty('--bg-primary', '#ffffff')
      document.body.style.setProperty('--bg-secondary', '#f9fafb')
      document.body.style.setProperty('--border-color', '#e5e7eb')
    } else {
      document.body.style.setProperty('--text-primary', '#f9fafb')
      document.body.style.setProperty('--text-secondary', '#d1d5db')
      document.body.style.setProperty('--bg-primary', '#111827')
      document.body.style.setProperty('--bg-secondary', '#1f2937')
      document.body.style.setProperty('--border-color', '#374151')
    }
    
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value = {
    theme,
    toggleTheme,
    setTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}