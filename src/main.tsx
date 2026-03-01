import { enableMapSet } from 'immer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { useWorkspaceStore } from './stores/workspace-store'
import type { ThemeId } from './types'

// Required for Immer to handle Map/Set mutations (used in document-store graphPositions)
enableMapSet()

// Apply dark mode class by default; theme class is managed reactively below
document.documentElement.classList.add('dark')
document.documentElement.classList.add('theme-default')

// Subscribe to theme changes and apply/remove theme classes on <html>
const themeClasses = [
  'theme-default',
  'theme-catppuccin-macchiato',
  'theme-catppuccin-latte',
  'theme-catppuccin-frappe',
  'theme-catppuccin-mocha',
  'theme-nord',
  'theme-nord-aurora',
  'theme-one-dark',
  'theme-rose-pine',
  'theme-rose-pine-dawn',
  'theme-tokyo-night',
  'theme-tokyo-night-day',
  'theme-dracula',
  'theme-dracula-soft',
] as const

function applyTheme(theme: ThemeId) {
  const html = document.documentElement
  themeClasses.forEach((cls) => html.classList.remove(cls))

  // Light themes: remove the 'dark' class
  if (theme === 'catppuccin-latte' || theme === 'nord-aurora' || theme === 'rose-pine-dawn' || theme === 'tokyo-night-day') {
    html.classList.remove('dark')
    html.classList.add(`theme-${theme}`)
  } else {
    html.classList.add('dark')
    if (theme === 'dark') html.classList.add('theme-default')
    else html.classList.add(`theme-${theme}`)
  }
}

// Apply persisted theme on load (subscription only fires on changes)
applyTheme(useWorkspaceStore.getState().theme)
useWorkspaceStore.subscribe((state, prev) => {
  if (state.theme !== prev.theme) applyTheme(state.theme)
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
