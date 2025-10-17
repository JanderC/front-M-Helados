import api from '../axiosConfig';

export const cajaService = {
  // Abrir caja
  abrir: (montoInicial, moneda = 'USD') => {
    return api.post('/caja/abrir', {
      montoInicial,
      moneda
    });
  },

  // Cerrar caja
  cerrar: (montoFinal, observaciones = '') => {
    return api.post('/caja/cerrar', {
      montoFinal,
      observaciones
    });
  },

  // Estado actual de la caja
  getEstado: () => {
    return api.get('/caja/estado');
  },

  // Flujo de caja
  getFlujo: (params = {}) => {
    return api.get('/caja/flujo', { params });
  },

  // Registrar transacción manual
  registrarTransaccion: (transaccionData) => {
    return api.post('/caja/transaccion', transaccionData);
  },

  // Resumen de ventas
  getResumenVentas: (params = {}) => {
    return api.get('/caja/resumen-ventas', { params });
  },

  // Historial de arqueos
  getHistorial: (params = {}) => {
    return api.get('/caja/historial', { params });
  }
};