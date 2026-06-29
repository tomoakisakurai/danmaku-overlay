import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import { Overlay } from './Overlay'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Overlay />
    </StrictMode>,
  )
}
