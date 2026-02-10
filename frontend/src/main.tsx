import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import i18n from './i18n'
import App from './App.tsx'
import { initFrontendSentry } from './lib/sentry'

void i18n

async function bootstrap() {
  await initFrontendSentry()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
