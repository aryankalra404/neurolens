import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {}
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('eeg_theme')
    if (savedTheme) {
      return savedTheme
    }
    // Check user preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    // Default to dark
    return 'dark'
  })

  useEffect(() => {
    // Update data attribute on HTML Element for global CSS targeting
    document.documentElement.setAttribute('data-theme', theme)
    // Save to localStorage
    localStorage.setItem('eeg_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
