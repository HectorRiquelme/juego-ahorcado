import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Colores alineados con tailwind.config.js tokens */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className: 'bg-bg-surface text-text border border-border rounded-xl text-sm',
          style: {
            background: undefined,
            color: undefined,
            border: undefined,
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#F1F5F9' },
          },
          error: {
            iconTheme: { primary: '#E94560', secondary: '#F1F5F9' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
