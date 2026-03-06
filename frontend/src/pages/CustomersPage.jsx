import { useEffect, useState } from 'react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/customers'
import { formatApiError } from '../utils/formatApiError'

const emptyForm = { nombre: '', direccion: '', telefono: '', email: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
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
      const res = await getCustomers()
      setCustomers(Array.isArray(res.data) ? res.data : (res.data?.results || []))
    } catch { setError('Error cargando clientes') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      nombre: c.nombre,
      direccion: c.direccion || '',
      telefono: c.telefono || '',
      email: c.email || '',
    })
    setFormError('')
    setShowModal(true)
  }
  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) await updateCustomer(editing.id, form)
      else await createCustomer(form)
      setFormError('')
      setShowModal(false)
      load()
    } catch (e) {
      setFormError(formatApiError(e, 'Error al guardar cliente'))
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await deleteCustomer(deleteId); setDeleteId(null); load() }
    catch { setError('Error al eliminar') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">👥</span><h1>Clientes</h1></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Cliente</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">👥</div><p>Sin clientes</p></div></td></tr>
              ) : customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.direccion || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td><div className="actions-cell">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>✏</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(c.id)}>🗑</button>
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
              <div className="modal-title">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {formError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {formError}
              </div>
            )}
            <div className="form-group"><label>Nombre *</label><input type="text" value={form.nombre} onChange={e => f('nombre', e.target.value)} /></div>
            <div className="form-group"><label>Dirección</label><input type="text" value={form.direccion} onChange={e => f('direccion', e.target.value)} /></div>
            <div className="form-group"><label>Teléfono</label><input type="text" value={form.telefono} onChange={e => f('telefono', e.target.value)} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
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
            <div className="modal-header"><div className="modal-title">Eliminar cliente</div></div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>¿Seguro que deseas eliminar este cliente?</p>
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
