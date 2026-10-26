import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

const app = import.meta.env.VITE_GOOGLE_CLIENT_ID
  ? <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}><App /></GoogleOAuthProvider>
  : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
