import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getReportFinancial } from '../api/reports'
import { getProducts } from '../api/products'
import { getSales } from '../api/sales'
import { getPurchases } from '../api/purchases'

export default function DashboardPage() {
  const [financial, setFinancial] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [fin, prods, sales, purchases] = await Promise.all([
          getReportFinancial(),
          getProducts({ low_stock: 'true' }),
          getSales(),
          getPurchases(),
        ])
        setFinancial(fin.data)
        const lowItems = Array.isArray(prods.data) ? prods.data : (prods.data?.results || [])
        setLowStock(lowItems.slice(0, 5))

        // Build chart: last 6 months using sale/purchase data grouped by month
        const salesList = Array.isArray(sales.data) ? sales.data : (sales.data?.results || [])
        const purchList = Array.isArray(purchases.data) ? purchases.data : (purchases.data?.results || [])

        const months = {}
        const monthLabel = (dateStr) => {
          const d = new Date(dateStr)
          return d.toLocaleString('es', { month: 'short', year: '2-digit' })
        }
        salesList.forEach(s => {
          const m = monthLabel(s.fecha)
          if (!months[m]) months[m] = { mes: m, ventas: 0, compras: 0 }
          months[m].ventas += parseFloat(s.total || 0)
        })
        purchList.forEach(p => {
          const m = monthLabel(p.fecha)
          if (!months[m]) months[m] = { mes: m, ventas: 0, compras: 0 }
          months[m].compras += parseFloat(p.total || 0)
        })
        setChartData(Object.values(months).slice(-6))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = (v) => `S/ ${parseFloat(v || 0).toFixed(2)}`

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="icon">📊</span>
          <h1>Dashboard</h1>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card accent">
          <span className="kpi-icon">💰</span>
          <div className="kpi-value">{fmt(financial?.total_ventas)}</div>
          <div className="kpi-label">Total Ventas</div>
        </div>
        <div className="kpi-card danger">
          <span className="kpi-icon">🛒</span>
          <div className="kpi-value">{fmt(financial?.total_compras)}</div>
          <div className="kpi-label">Total Compras</div>
        </div>
        <div className="kpi-card success">
          <span className="kpi-icon">📈</span>
          <div className="kpi-value">{fmt(financial?.ganancia_neta)}</div>
          <div className="kpi-label">Ganancia Neta</div>
        </div>
        <div className="kpi-card info">
          <span className="kpi-icon">⚠️</span>
          <div className="kpi-value">{lowStock.length}</div>
          <div className="kpi-label">Stock Bajo</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Ventas vs Compras por Mes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `S/${v}`} />
              <Tooltip
                contentStyle={{ background: '#1a2535', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(v) => [`S/ ${v.toFixed(2)}`]}
              />
              <Bar dataKey="ventas" name="Ventas" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="compras" name="Compras" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>⚠️ Stock Bajo</h3>
          {lowStock.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin alertas de stock bajo 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStock.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 8,
                  borderLeft: '3px solid var(--danger)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.location}</div>
                  </div>
                  <span className="badge badge-danger">{p.stock} uds</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
