import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../api/users'
import { useAuth } from '../context/AuthContext'
import { formatApiError } from '../utils/formatApiError'

const emptyForm = { username: '', password: '', role: 'Employee', location: 'Local 1' }

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      setUsers(Array.isArray(res.data) ? res.data : (res.data?.results || []))
    } catch { setError('Error cargando usuarios') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (currentUser?.role !== 'Administrator') {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <p>Solo los administradores pueden acceder a esta sección.</p>
      </div>
    )
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ username: u.username, password: '', role: u.role, location: u.location })
    setFormError('')
    setShowModal(true)
  }
  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) await updateUser(editing.id, payload)
      else await createUser(payload)
      setFormError('')
      setShowModal(false)
      load()
    } catch (e) {
      setFormError(formatApiError(e, 'Error al guardar usuario'))
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await deleteUser(deleteId); setDeleteId(null); load() }
    catch { setError('Error al eliminar') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">👤</span><h1>Usuarios</h1></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Usuario</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Usuario</th><th>Rol</th><th>Local</th><th>Acciones</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">👤</div><p>Sin usuarios</p></div></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.username} {u.id === currentUser?.id && <span className="badge badge-accent" style={{ marginLeft: 6 }}>Tú</span>}</td>
                  <td><span className={`badge ${u.role === 'Administrator' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                  <td>{u.location}</td>
                  <td><div className="actions-cell">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏</button>
                    {u.id !== currentUser?.id && <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(u.id)}>🗑</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {formError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {formError}
              </div>
            )}
            <div className="form-group"><label>Nombre de usuario *</label><input type="text" value={form.username} onChange={e => f('username', e.target.value)} /></div>
            <div className="form-group">
              <label>Contraseña {editing && '(dejar vacío para no cambiar)'}</label>
              <input type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder={editing ? '••••••••' : ''} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Rol</label>
                <select value={form.role} onChange={e => f('role', e.target.value)}>
                  <option value="Administrator">Administrador</option>
                  <option value="Employee">Empleado</option>
                </select>
              </div>
              <div className="form-group"><label>Local</label>
                <select value={form.location} onChange={e => f('location', e.target.value)}>
                  <option>Local 1</option>
                  <option>Local 2</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Eliminar usuario</div></div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>¿Seguro que deseas eliminar este usuario?</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
