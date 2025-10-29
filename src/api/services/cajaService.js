import api from '../axiosConfig';

// Mapeo de códigos de moneda a IDs
const MONEDAS_MAP = {
  'USD': 1,
  'VES': 2,
  'COP': 3
};

export const cajaService = {
  // Abrir caja - CORREGIDO para coincidir con el backend
  abrir: (montoInicial, moneda = 'COP') => {
    const body = {
      monto_inicial_usd: moneda === 'USD' ? parseFloat(montoInicial) : 0,
      monto_inicial_ves: moneda === 'VES' ? parseFloat(montoInicial) : 0,
      monto_inicial_cop: moneda === 'COP' ? parseFloat(montoInicial) : 0,
      notas: `Apertura de caja con ${montoInicial} ${moneda}`
    };
    return api.post('/caja/abrir', body);
  },

  // Cerrar caja - CORREGIDO
  cerrar: (montoFinal, moneda = 'COP', observaciones = '') => {
    const body = {
      monto_final_usd: moneda === 'USD' ? parseFloat(montoFinal) : 0,
      monto_final_ves: moneda === 'VES' ? parseFloat(montoFinal) : 0,
      monto_final_cop: moneda === 'COP' ? parseFloat(montoFinal) : 0,
      notas: observaciones
    };
    return api.post('/caja/cerrar', body);
  },

  // Estado actual de la caja
  getEstado: () => {
    return api.get('/caja/estado');
  },

  // Flujo de caja - CORREGIDO parámetros
  getFlujo: (params = {}) => {
    const queryParams = {
      fecha_inicio: params.fechaInicio,
      fecha_fin: params.fechaFin,
      tipo: params.tipo
    };
    return api.get('/caja/flujo', { params: queryParams });
  },

  // Registrar transacción manual - CORREGIDO
  registrarTransaccion: (transaccionData) => {
    // Convertir código de moneda a ID
    const idMoneda = MONEDAS_MAP[transaccionData.moneda] || 3; // Por defecto COP
    
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

  // Resumen de ventas - CORREGIDO
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
  }
};