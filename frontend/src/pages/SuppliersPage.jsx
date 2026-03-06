import { useEffect, useState } from 'react'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/suppliers'
import { formatApiError } from '../utils/formatApiError'

const emptyForm = { nombre: '', direccion: '', telefono: '', email: '' }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
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
      const res = await getSuppliers()
      setSuppliers(Array.isArray(res.data) ? res.data : (res.data?.results || []))
    } catch { setError('Error cargando proveedores') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      nombre: s.nombre,
      direccion: s.direccion || '',
      telefono: s.telefono || '',
      email: s.email || '',
    })
    setFormError('')
    setShowModal(true)
  }
  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) await updateSupplier(editing.id, form)
      else await createSupplier(form)
      setFormError('')
      setShowModal(false)
      load()
    } catch (e) {
      setFormError(formatApiError(e, 'Error al guardar proveedor'))
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await deleteSupplier(deleteId); setDeleteId(null); load() }
    catch { setError('Error al eliminar') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">🏭</span><h1>Proveedores</h1></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Proveedor</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nombre</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">🏭</div><p>Sin proveedores</p></div></td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.direccion || '—'}</td>
                  <td>{s.telefono || '—'}</td>
                  <td>{s.email || '—'}</td>
                  <td><div className="actions-cell">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>✏</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(s.id)}>🗑</button>
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
              <div className="modal-title">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</div>
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
            <div className="modal-header"><div className="modal-title">Eliminar proveedor</div></div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>¿Seguro que deseas eliminar este proveedor?</p>
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
