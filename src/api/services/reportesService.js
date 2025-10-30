import api from '../axiosConfig';

export const reportesService = {
  // Dashboard general
  getDashboard: (params = {}) => {
    return api.get('/reportes/dashboard', { params });
  },

  // Generar reporte mensual
  generarReporteMensual: (mes, anio) => {
    return api.post('/reportes/generar-mensual', { mes, anio });
  },

  // Obtener reportes mensuales
  getReportesMensuales: (params = {}) => {
    return api.get('/reportes/mensuales', { params });
  },

  // Productos más vendidos
  getProductosVendidos: (params = {}) => {
    return api.get('/reportes/productos-vendidos', { params });
  },

  // Toppings más usados
  getToppingsUsados: (params = {}) => {
    return api.get('/reportes/toppings-usados', { params });
  },

  // Reporte de inventario (CORREGIDO)
  getReporteInventario: () => {
    return api.get('/reportes/inventario');
  },

  // Ventas por categoría
  getVentasPorCategoria: (params = {}) => {
    return api.get('/reportes/ventas-categoria', { params });
  }
};