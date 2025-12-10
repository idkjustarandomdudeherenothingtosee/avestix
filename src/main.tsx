import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '../App'
import '../index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Failed to find root element with id="root"')
}

createRoot(container).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
