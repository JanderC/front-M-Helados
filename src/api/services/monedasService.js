import api from '../axiosConfig';

export const monedasService = {
  // Obtener tasas actuales
  getTasas: () => {
    return api.get('/monedas/tasas');
  },

  // Obtener tasa VES actual
  getTasaVES: () => {
    return api.get('/monedas/tasa-ves');
  },

  // Actualizar desde BCV (API) — pueden llamarse las veces que quieran
  actualizarBCV: () => {
    return api.post('/monedas/actualizar-bcv');
  },

  // Actualizar manualmente una sola moneda (ej: VES)
  // Hace el mismo UPDATE sobre tasa_cambio_usd / fecha_actualizacion
  // que el flujo automático, solo que con un valor ingresado a mano.
  actualizarManual: (codigo_moneda, tasa_cambio_usd) => {
    return api.put('/monedas/actualizar-manual', {
      codigo_moneda,
      tasa_cambio_usd
    });
  },

  // Actualizar múltiples tasas manualmente en un solo lote
  actualizarMultiples: (tasas) => {
    return api.put('/monedas/actualizar-multiples', {
      tasas
    });
  },

  // Convertir monedas
  convertir: (monto, moneda_origen, moneda_destino) => {
    return api.post('/monedas/convertir', {
      monto,
      moneda_origen,
      moneda_destino
    });
  }
};