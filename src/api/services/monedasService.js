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
  actualizarManual: (moneda, tasa) => {
    return api.put('/monedas/actualizar-manual', {
      moneda,
      tasa
    });
  },

  // Convertir monedas
  convertir: (monto, monedaOrigen, monedaDestino) => {
    return api.post('/monedas/convertir', {
      monto,
      monedaOrigen,
      monedaDestino
    });
  }
};