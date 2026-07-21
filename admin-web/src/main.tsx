import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const originalFetch = window.fetch;
const BACKEND_URL = 'https://vialflow-backend-392406857647.europe-central2.run.app';

window.fetch = async (input, init) => {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as any).url;
  if (url.startsWith('http://localhost:3000')) {
    url = url.replace('http://localhost:3000', BACKEND_URL);
  } else if (url.startsWith('/api/')) {
    url = BACKEND_URL + url;
  }
  const token = localStorage.getItem('jwtToken');
  if (token) {
    init = init || {};
    init.headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return originalFetch(url, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
