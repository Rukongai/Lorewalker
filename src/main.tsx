import { enableMapSet } from 'immer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'

// Required for Immer to handle Map/Set mutations (used in document-store graphPositions)
enableMapSet()

// Apply dark mode class by default
document.documentElement.classList.add('dark')

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
