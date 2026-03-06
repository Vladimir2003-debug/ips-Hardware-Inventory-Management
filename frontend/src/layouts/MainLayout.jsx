import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MainLayout.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/inventory', label: 'Inventario', icon: '📦' },
  { to: '/products', label: 'Productos', icon: '🔧' },
  { to: '/sales', label: 'Ventas', icon: '💰' },
  { to: '/purchases', label: 'Compras', icon: '🛒' },
  { to: '/customers', label: 'Clientes', icon: '👥' },
  { to: '/suppliers', label: 'Proveedores', icon: '🏭' },
  { to: '/history', label: 'Historial', icon: '📋' },
  { to: '/reports', label: 'Reportes', icon: '📈' },
]

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🔩</span>
          <div>
            <div className="brand-name">Cóndor Majes</div>
            <div className="brand-sub">Sistema de Gestión</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {user?.role === 'Administrator' && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">👤</span>
              <span>Usuarios</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role} · {user?.location}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">⏻</button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
