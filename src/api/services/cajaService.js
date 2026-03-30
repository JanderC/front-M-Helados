import api from '../axiosConfig';

// Mapeo de códigos de moneda a IDs
const MONEDAS_MAP = {
  'USD': 1,
  'VES': 2,
  'COP': 3
};

export const cajaService = {
  // Abrir caja - acepta montos por moneda
  abrir: (montoInicial, moneda = 'COP', notas = '') => {
    const body = {
      monto_inicial_usd: moneda === 'USD' ? parseFloat(montoInicial) : 0,
      monto_inicial_ves: moneda === 'VES' ? parseFloat(montoInicial) : 0,
      monto_inicial_cop: moneda === 'COP' ? parseFloat(montoInicial) : 0,
      notas: notas || `Apertura de caja con ${montoInicial} ${moneda}`
    };
    return api.post('/caja/abrir', body);
  },

  /**
   * Cerrar caja — CORREGIDO: envía los tres montos por separado
   * @param {object} montosFinal - { cop, usd, ves }
   * @param {string} observaciones
   */
  cerrar: (montosFinal = {}, observaciones = '') => {
    const body = {
      monto_final_cop: parseFloat(montosFinal.cop) || 0,
      monto_final_usd: parseFloat(montosFinal.usd) || 0,
      monto_final_ves: parseFloat(montosFinal.ves) || 0,
      notas: observaciones || null,
    };
    return api.post('/caja/cerrar', body);
  },

  // Estado actual de la caja
  getEstado: () => {
    return api.get('/caja/estado');
  },

  // Flujo de caja
  getFlujo: (params = {}) => {
    const queryParams = {
      fecha_inicio: params.fechaInicio,
      fecha_fin: params.fechaFin,
      tipo: params.tipo
    };
    return api.get('/caja/flujo', { params: queryParams });
  },

  // Registrar transacción manual
  registrarTransaccion: (transaccionData) => {
    const idMoneda = MONEDAS_MAP[transaccionData.moneda] || 3;
    const body = {
      tipo_transaccion: transaccionData.tipo,
      concepto: transaccionData.concepto,
      descripcion: transaccionData.descripcion || '',
      monto: parseFloat(transaccionData.monto),
      id_moneda: idMoneda,
      categoria_gasto: transaccionData.categoriaGasto || null,
      metodo_pago: transaccionData.metodoPago || 'EFECTIVO'
    };
    return api.post('/caja/transaccion', body);
  },

  // Resumen de ventas por período
  getResumenVentas: (params = {}) => {
    const queryParams = {
      periodo: params.periodo || 'diario',
      fecha_inicio: params.fechaInicio,
      fecha_fin: params.fechaFin
    };
    return api.get('/caja/resumen-ventas', { params: queryParams });
  },

  // Historial de arqueos
  getHistorial: (params = {}) => {
    return api.get('/caja/historial', { params });
  },

  getVentasPorArqueo: (idArqueo) =>
  api.get(`/caja/historial/${idArqueo}/ventas`),

};