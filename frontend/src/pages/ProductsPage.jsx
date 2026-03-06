import { useEffect, useState } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products'
import { formatApiError } from '../utils/formatApiError'

const emptyForm = { nombre: '', descripcion: '', precio: '', stock: '', low_stock_threshold: 10, location: 'Local 1' }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
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
      const res = await getProducts({ search, location })
      setProducts(Array.isArray(res.data) ? res.data : (res.data?.results || []))
    } catch { setError('Error cargando productos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, location])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio,
      stock: p.stock,
      low_stock_threshold: p.low_stock_threshold,
      location: p.location,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) await updateProduct(editing.id, form)
      else await createProduct(form)
      setFormError('')
      setShowModal(false)
      load()
    } catch (e) {
      setFormError(formatApiError(e, 'Error al guardar producto'))
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteId)
      setDeleteId(null)
      load()
    } catch (e) {
      setError(formatApiError(e, 'Error al eliminar'))
      setDeleteId(null)
    }
  }

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">🔧</span><h1>Productos</h1></div>
        <button id="create-product-btn" className="btn btn-primary" onClick={openCreate}>+ Nuevo Producto</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <input className="search-input" type="text" placeholder="🔍 Buscar..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select value={location} onChange={e => setLocation(e.target.value)} style={{ width: 140 }}>
          <option value="">Todos los locales</option>
          <option value="Local 1">Local 1</option>
          <option value="Local 2">Local 2</option>
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Descripción</th><th>Precio</th><th>Stock</th><th>Umbral</th><th>Local</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🔧</div><p>Sin productos</p></div></td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.descripcion || '—'}</td>
                  <td>S/ {parseFloat(p.precio).toFixed(2)}</td>
                  <td style={{ color: p.stock <= p.low_stock_threshold ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{p.stock}</td>
                  <td>{p.low_stock_threshold}</td>
                  <td><span className="badge badge-info">{p.location}</span></td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p.id)}>🗑</button>
                    </div>
                  </td>
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
              <div className="modal-title">{editing ? 'Editar Producto' : 'Nuevo Producto'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {formError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {formError}
              </div>
            )}
            <div className="form-group"><label>Nombre</label><input type="text" value={form.nombre} onChange={e => f('nombre', e.target.value)} /></div>
            <div className="form-group"><label>Descripción</label><input type="text" value={form.descripcion} onChange={e => f('descripcion', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Precio (S/)</label><input type="number" step="0.01" value={form.precio} onChange={e => f('precio', e.target.value)} /></div>
              <div className="form-group"><label>Stock Inicial</label><input type="number" value={form.stock} onChange={e => f('stock', e.target.value)} /></div>
              <div className="form-group"><label>Umbral Stock Bajo</label><input type="number" value={form.low_stock_threshold} onChange={e => f('low_stock_threshold', e.target.value)} /></div>
              <div className="form-group"><label>Local</label>
                <select value={form.location} onChange={e => f('location', e.target.value)}>
                  <option>Local 1</option><option>Local 2</option>
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
            <div className="modal-header"><div className="modal-title">Confirmar eliminación</div></div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>¿Seguro que deseas eliminar este producto? Esta acción no se puede deshacer.</p>
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
