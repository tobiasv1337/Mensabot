import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './app/App.tsx'
import { ThemeProvider } from './shared/theme/themeProvider.tsx'
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

const scheduleServiceWorkerUpdateChecks = (registration: ServiceWorkerRegistration) => {
  const updateRegistration = () => {
    if (document.visibilityState !== 'visible') {
      return
    }

    registration.update().catch((error) => {
      console.warn('Service worker update check failed:', error)
    })
  }

  window.addEventListener('focus', updateRegistration)
  window.addEventListener('online', updateRegistration)
  window.addEventListener('pageshow', updateRegistration)
  document.addEventListener('visibilitychange', updateRegistration)

  updateRegistration()
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        return
      }

      scheduleServiceWorkerUpdateChecks(registration)
    },
    onRegisterError(error) {
      console.warn('Service worker registration failed:', error)
    },
  })
}
