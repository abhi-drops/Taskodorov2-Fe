import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/geomini/400.css'
import '@fontsource/geomini/700.css'
import '@fontsource-variable/google-sans-flex/wght.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
