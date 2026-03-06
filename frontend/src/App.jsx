import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import PurchasesPage from './pages/PurchasesPage'
import CustomersPage from './pages/CustomersPage'
import SuppliersPage from './pages/SuppliersPage'
import HistoryPage from './pages/HistoryPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/purchases" element={<PurchasesPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
