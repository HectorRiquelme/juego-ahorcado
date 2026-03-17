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
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1A1A2E',
            color: '#F1F5F9',
            border: '1px solid #2D2D44',
            borderRadius: '12px',
            fontSize: '14px',
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
