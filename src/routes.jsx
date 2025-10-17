import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/common/Layout';

// Screens
import LoginScreen from './screens/auth/LoginScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import ProductosScreen from './screens/inventario/ProductosScreen';
import ToppingsScreen from './screens/inventario/ToppingsScreen';
import NuevaVentaScreen from './screens/ventas/NuevaVentaScreen';
import ListaVentasScreen from './screens/ventas/ListaVentasScreen';
import PedidosScreen from './screens/despensador/PedidosScreen';
import FlujoCajaScreen from './screens/caja/FlujoCajaScreen';
import ReportesScreen from './screens/reportes/ReportesScreen';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginScreen />
  },
  {
    path: '/',
    element: (
        <Layout>
          <Navigate to="/dashboard" replace />
        </Layout>
    )
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout>
          <DashboardScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/productos',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout>
          <ProductosScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/toppings',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout>
          <ToppingsScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/ventas',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout>
          <NuevaVentaScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/ventas/lista',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout>
          <ListaVentasScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/pedidos',
    element: (
      <ProtectedRoute>
        <Layout>
          <PedidosScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/caja',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout>
          <FlujoCajaScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '/reportes',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout>
          <ReportesScreen />
        </Layout>
      </ProtectedRoute>
    )
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />
  }
]);