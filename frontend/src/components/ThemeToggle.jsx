import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import './ThemeToggle.css'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-toggle-icon">
        {theme === 'light' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3V1M10 19V17M17 10H19M1 10H3M15.657 15.657L14.243 14.243M5.757 5.757L4.343 4.343M15.657 4.343L14.243 5.757M5.757 14.243L4.343 15.657M14 10C14 12.2091 12.2091 14 10 14C7.79086 14 6 12.2091 6 10C6 7.79086 7.79086 6 10 6C12.2091 6 14 7.79086 14 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.293 13.293C16.3785 14.2075 15.3055 14.9145 14.1142 15.4149C12.9228 15.9152 11.6365 16.1658 10.3352 16.1658C9.03398 16.1658 7.74764 15.9152 6.55628 15.4149C5.36492 14.9145 4.29189 14.2075 3.3774 13.293C2.46291 12.3785 1.75585 11.3055 1.2555 10.1141C0.755146 8.92277 0.504578 7.63643 0.504578 6.33519C0.504578 5.03395 0.755146 3.74761 1.2555 2.55625C1.75585 1.36489 2.46291 0.291861 3.3774 0.377368C4.29189 0.291861 5.36492 0.998925 6.55628 1.49928C7.74764 1.99963 9.03398 2.2502 10.3352 2.2502C11.6365 2.2502 12.9228 1.99963 14.1142 1.49928C15.3055 0.998925 16.3785 0.291861 17.293 0.377368C18.2075 0.291861 18.9145 0.998925 19.4149 1.49928C19.9152 1.99963 20.1658 2.55625 20.1658 3.74761C20.1658 4.93897 19.9152 6.22531 19.4149 7.41667C18.9145 8.60803 18.2075 9.68106 17.293 10.5956C16.3785 11.51 15.3055 12.2171 14.1142 12.7174C12.9228 13.2178 11.6365 13.4684 10.3352 13.4684C9.03398 13.4684 7.74764 13.2178 6.55628 12.7174C5.36492 12.2171 4.29189 11.51 3.3774 10.5956Z" fill="currentColor"/>
          </svg>
        )}
      </span>
    </button>
  )
}

export default ThemeToggle

