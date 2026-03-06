import { useEffect, useState } from 'react'
import { getHistory } from '../api/history'

const TIPO_LABELS = { venta: 'Venta', compra: 'Compra', ajuste: 'Ajuste' }
const TIPO_BADGE = { venta: 'badge-success', compra: 'badge-info', ajuste: 'badge-warning' }

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getHistory()
        setHistory(Array.isArray(res.data) ? res.data : (res.data?.results || []))
      } catch { setError('Error cargando historial') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">📋</span><h1>Historial de Movimientos</h1></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Stock Resultante</th>
                <th>Usuario</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">📋</div><p>Sin movimientos</p></div></td></tr>
              ) : history.map(h => (
                <tr key={h.id}>
                  <td>#{h.id}</td>
                  <td>{h.fecha?.slice(0, 16).replace('T', ' ')}</td>
                  <td style={{ fontWeight: 600 }}>{h.producto?.nombre || h.producto_nombre || '—'}</td>
                  <td>
                    <span className={`badge ${TIPO_BADGE[h.tipo_movimiento] || 'badge-accent'}`}>
                      {TIPO_LABELS[h.tipo_movimiento] || h.tipo_movimiento}
                    </span>
                  </td>
                  <td style={{ color: h.cantidad >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                    {h.cantidad >= 0 ? '+' : ''}{h.cantidad}
                  </td>
                  <td>{h.stock_resultante}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{h.usuario?.username || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{h.detalles || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
