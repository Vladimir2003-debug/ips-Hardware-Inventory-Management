import { useEffect, useState } from 'react'
import { getPurchases, createPurchase, deletePurchase } from '../api/purchases'
import { getSuppliers } from '../api/suppliers'
import { getProducts } from '../api/products'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState([{ product_id: '', quantity: 1, unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta
      const [pur, sup, prod] = await Promise.all([getPurchases(params), getSuppliers(), getProducts()])
      setPurchases(Array.isArray(pur.data) ? pur.data : (pur.data?.results || []))
      setSuppliers(Array.isArray(sup.data) ? sup.data : (sup.data?.results || []))
      setProducts(Array.isArray(prod.data) ? prod.data : (prod.data?.results || []))
    } catch { setError('Error cargando datos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [desde, hasta])

  const addLine = () => setLines(prev => [...prev, { product_id: '', quantity: 1, unit_price: '' }])
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i))
  const updateLine = (i, field, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const handleCreate = async () => {
    if (!supplierId) return setError('Selecciona un proveedor')
    setSaving(true)
    try {
      await createPurchase({
        supplier_id: parseInt(supplierId),
        products: lines.map(l => ({ product_id: parseInt(l.product_id), quantity: parseInt(l.quantity), unit_price: parseFloat(l.unit_price) }))
      })
      setShowModal(false)
      setSupplierId('')
      setLines([{ product_id: '', quantity: 1, unit_price: '' }])
      load()
    } catch (e) { setError(e.response?.data ? JSON.stringify(e.response.data) : 'Error al crear compra') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await deletePurchase(deleteId); setDeleteId(null); load() }
    catch { setError('Error al eliminar') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">🛒</span><h1>Compras</h1></div>
        <button id="create-purchase-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nueva Compra</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Desde:</span>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 150 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Hasta:</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 150 }} />
        {(desde || hasta) && <button className="btn btn-secondary btn-sm" onClick={() => { setDesde(''); setHasta('') }}>✕ Limpiar</button>}
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Fecha</th><th>Proveedor</th><th>Total (S/)</th><th>Acciones</th></tr></thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">🛒</div><p>Sin compras</p></div></td></tr>
              ) : purchases.map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{p.fecha?.slice(0, 10)}</td>
                  <td>{p.proveedor?.nombre || p.proveedor_nombre || '—'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--info)' }}>S/ {parseFloat(p.total || 0).toFixed(2)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p.id)}>🗑 Anular</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Nueva Compra</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Proveedor</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">— Seleccionar proveedor —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="section-title" style={{ marginTop: 16 }}>Productos</div>
            {lines.map((l, i) => (
              <div key={i} className="line-item">
                <select value={l.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}>
                  <option value="">— Producto —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <input type="number" min="1" placeholder="Cant." value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                <input type="number" step="0.01" placeholder="Precio unit." value={l.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeLine(i)} disabled={lines.length === 1}>✕</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginTop: 6 }}>+ Agregar línea</button>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Compra'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Anular Compra #{deleteId}</div></div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Esta acción descontará el stock y eliminará la compra. ¿Confirmar?</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Sí, Anular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
