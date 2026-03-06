import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">🔩</span>
          <h1>Cóndor Majes</h1>
          <p>Sistema de Gestión Empresarial</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Usuario</label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión →'}
          </button>
        </form>

        <p className="login-footer">
          Ferretería Cóndor Majes S.A.C · Transportes Cóndor Sur S.A.C
        </p>
      </div>
    </div>
  )
}
