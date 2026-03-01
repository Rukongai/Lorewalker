import { enableMapSet } from 'immer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { useWorkspaceStore } from './stores/workspace-store'
import type { ThemeId } from './stores/workspace-store'

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
] as const

function applyTheme(theme: ThemeId) {
  const html = document.documentElement
  themeClasses.forEach((cls) => html.classList.remove(cls))

  // Latte is light-mode; all other themes use dark-mode base
  if (theme === 'catppuccin-latte') {
    html.classList.remove('dark')
    html.classList.add('theme-catppuccin-latte')
  } else {
    html.classList.add('dark')
    if (theme === 'catppuccin-macchiato') html.classList.add('theme-catppuccin-macchiato')
    else if (theme === 'catppuccin-frappe') html.classList.add('theme-catppuccin-frappe')
    else if (theme === 'catppuccin-mocha') html.classList.add('theme-catppuccin-mocha')
    else html.classList.add('theme-default')
  }
}

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
