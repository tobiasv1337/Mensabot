import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './app/App.tsx'
import { ThemeProvider } from './theme/themeProvider.tsx'
import './app/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn('Service worker registration failed:', error)
    },
  })
}
