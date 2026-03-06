import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { getReportSales, getReportPurchases, getReportFinancial } from '../api/reports'

export default function ReportsPage() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta
      const [sales, purchases, financial] = await Promise.all([
        getReportSales(params),
        getReportPurchases(params),
        getReportFinancial(params),
      ])
      setData({ sales: sales.data, purchases: purchases.data, financial: financial.data })
    } catch { setError('Error cargando reportes') }
    finally { setLoading(false) }
  }

  const downloadPDF = (type) => {
    const token = localStorage.getItem('access_token')
    const url = `/api/pdf/${type}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${type}.pdf`
        a.click()
      })
  }

  const fmt = (v) => `S/ ${parseFloat(v || 0).toFixed(2)}`

  const chartData = data ? [
    { name: 'Ventas', valor: parseFloat(data.financial?.total_ventas || 0), fill: '#f97316' },
    { name: 'Compras', valor: parseFloat(data.financial?.total_compras || 0), fill: '#3b82f6' },
    { name: 'Ganancia', valor: parseFloat(data.financial?.ganancia_neta || 0), fill: '#22c55e' },
  ] : []

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><span className="icon">📈</span><h1>Reportes</h1></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>Filtrar por período</h3>
        <div className="toolbar">
          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <label style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>Desde:</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 160 }} />
          </div>
          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <label style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>Hasta:</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 160 }} />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? 'Cargando...' : '🔍 Generar Reporte'}</button>
        </div>
      </div>

      {data && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card accent">
              <span className="kpi-icon">💰</span>
              <div className="kpi-value">{fmt(data.financial?.total_ventas)}</div>
              <div className="kpi-label">Total Ventas</div>
            </div>
            <div className="kpi-card danger">
              <span className="kpi-icon">🛒</span>
              <div className="kpi-value">{fmt(data.financial?.total_compras)}</div>
              <div className="kpi-label">Total Compras</div>
            </div>
            <div className="kpi-card success">
              <span className="kpi-icon">📈</span>
              <div className="kpi-value">{fmt(data.financial?.ganancia_neta)}</div>
              <div className="kpi-label">Ganancia Neta</div>
            </div>
            <div className="kpi-card info">
              <span className="kpi-icon">🧾</span>
              <div className="kpi-value">{data.sales?.count || 0}</div>
              <div className="kpi-label">N° de Ventas</div>
            </div>
            <div className="kpi-card info">
              <span className="kpi-icon">📦</span>
              <div className="kpi-value">{data.purchases?.count || 0}</div>
              <div className="kpi-label">N° de Compras</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Resumen Financiero</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `S/${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1a2535', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}
                    formatter={(v) => [`S/ ${v.toFixed(2)}`]}
                  />
                  <Bar dataKey="valor" name="Monto" fill="#f97316" radius={[4,4,0,0]}
                    label={false}
                    isAnimationActive={true}
                    cells={chartData.map((entry, idx) => (
                      <rect key={idx} fill={entry.fill} />
                    ))}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Descargar PDFs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => downloadPDF('sales')}>
                  📄 Reporte de Ventas PDF
                </button>
                <button className="btn btn-secondary" onClick={() => downloadPDF('purchases')}>
                  📄 Reporte de Compras PDF
                </button>
                <button className="btn btn-secondary" onClick={() => downloadPDF('inventory-history')}>
                  📄 Historial de Inventario PDF
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <p>Configura el período y presiona <strong>Generar Reporte</strong></p>
        </div>
      )}
    </div>
  )
}
