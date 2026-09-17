import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'
import { getAdminUser } from './api'
import './styles.css'

function App() {
  const [authed, setAuthed] = useState(() => !!getAdminUser())
  if (!authed) return <LoginPage onSuccess={() => setAuthed(true)} />
  return <Dashboard />
}

createRoot(document.getElementById('root')!).render(<App />)
