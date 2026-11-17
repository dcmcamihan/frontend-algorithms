import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './harness/App'
import './harness/harness.css'

performance.mark('mount-start')
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
