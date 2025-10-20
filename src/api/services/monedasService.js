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

  // Actualizar desde BCV
  actualizarBCV: () => {
    return api.post('/monedas/actualizar-bcv');
  },

  // Actualizar manual
  actualizarManual: (codigo_moneda, tasa_cambio_usd) => {
    return api.put('/monedas/actualizar-manual', {
      codigo_moneda,
      tasa_cambio_usd
    });
  },

  // Actualizar múltiples tasas
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