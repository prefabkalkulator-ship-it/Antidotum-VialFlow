import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ReceptionTablet from './pages/ReceptionTablet'

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  let url = input.toString();
  if (url.startsWith('http://localhost:3000')) {
    url = url.replace('http://localhost:3000', 'https://vialflow-backend-392406857647.europe-central2.run.app');
  }
  return originalFetch(url, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReceptionTablet />
  </StrictMode>,
)
