import { useState } from 'react'
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { adminLogin, setupAdmin } from './api'

type Props = { onSuccess: () => void }

export default function LoginPage({ onSuccess }: Props) {
  const [mode,     setMode]     = useState<'login' | 'setup'>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'setup') await setupAdmin(email, password, name)
      await adminLogin(email, password)
      onSuccess()
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-mark">C</span>
          <span className="logo-wordmark">CINE<em>FLIX</em></span>
        </div>
        <span className="login-portal-badge">Admin Portal</span>

        <h1>{mode === 'login' ? 'Welcome back' : 'Create admin account'}</h1>
        <p className="login-sub">
          {mode === 'login' ? 'Sign in to manage your content library.' : 'Set up your first admin account.'}
        </p>

        {error && (
          <div className="login-error">
            <AlertCircle size={15} />{error}
          </div>
        )}

        <form onSubmit={submit}>
          {mode === 'setup' && (
            <div className="field">
              <label>Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" required autoFocus />
            </div>
          )}
          <div className="field">
            <label>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@cineflix.com" required autoFocus={mode === 'login'} />
          </div>
          <div className="field">
            <label>Password</label>
            <div className="pass-wrap">
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8} />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><LogIn size={16} />{mode === 'login' ? 'Sign in' : 'Create & sign in'}</>}
          </button>
        </form>

        <p className="login-switch">
          {mode === 'login'
            ? <>First time? <button onClick={() => { setMode('setup'); setError('') }}>Set up admin account</button></>
            : <>Have an account? <button onClick={() => { setMode('login'); setError('') }}>Sign in</button></>
          }
        </p>
      </div>
      <p className="login-footer">Cineflix Admin · Private access only</p>
    </div>
  )
}
