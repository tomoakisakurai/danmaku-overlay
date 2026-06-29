import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import { Control } from './Control'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Control />
    </StrictMode>,
  )
}
