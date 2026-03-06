import { useEffect, useState } from 'react'
import { getInventory } from '../api/inventory'
import { adjustInventory } from '../api/inventory'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (location) params.location = location
      const res = await getInventory(params)
      setItems(Array.isArray(res.data) ? res.data : (res.data?.results || []))
    } catch { setError('Error cargando inventario') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, location])

  const openAdjust = (item) => {
    setAdjustTarget(item)
    setAdjustQty(0)
    setAdjustNote('')
    setShowAdjust(true)
  }

  const saveAdjust = async () => {
    if (!adjustQty) return
    setSaving(true)
    try {
      await adjustInventory({ product_id: adjustTarget.id, quantity: parseInt(adjustQty), movement_type: adjustNote || 'Adjustment' })
      setShowAdjust(false)
      load()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al ajustar')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">📦</span><h1>Inventario</h1></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <input className="search-input" type="text" placeholder="🔍 Buscar producto..." value={search}
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
              <tr>
                <th>Producto</th>
                <th>Descripción</th>
                <th>Local</th>
                <th>Stock</th>
                <th>Precio (S/)</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📦</div><p>Sin productos</p></div></td></tr>
              ) : items.map(item => {
                const isLow = item.stock <= item.low_stock_threshold
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.descripcion || '—'}</td>
                    <td><span className="badge badge-info">{item.location}</span></td>
                    <td style={{ fontWeight: 700, color: isLow ? 'var(--danger)' : 'var(--success)' }}>{item.stock}</td>
                    <td>S/ {parseFloat(item.precio || 0).toFixed(2)}</td>
                    <td>
                      {isLow
                        ? <span className="badge badge-danger">⚠ Stock Bajo</span>
                        : <span className="badge badge-success">✓ OK</span>}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openAdjust(item)}>Ajustar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdjust && adjustTarget && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Ajustar Stock — {adjustTarget.nombre}</div>
              <button className="modal-close" onClick={() => setShowAdjust(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Stock actual: <strong style={{ color: 'var(--text-primary)' }}>{adjustTarget.stock}</strong>
            </p>
            <div className="form-group">
              <label>Cantidad (positivo para añadir, negativo para reducir)</label>
              <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Motivo / Nota</label>
              <input type="text" placeholder="Ej: Corrección de conteo" value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveAdjust} disabled={saving}>
                {saving ? 'Guardando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
