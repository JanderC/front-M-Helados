import api from '../axiosConfig';

// ⚠️ Ajusta el import de arriba si tu proyecto expone el cliente axios
// con otro nombre/ruta (revisa cómo lo hace ventasService.js o cajaService.js
// en tu carpeta api/services/).

export const metodosPagoService = {
  // Lista métodos de pago. Pasa { id_moneda } para traer los universales +
  // los específicos de esa moneda (ej: Nequi/Bancolombia solo para COP).
  getAll: (params = {}) => api.get('/metodos-pago', { params }),

  create: (data) => api.post('/metodos-pago', data),

  update: (id, data) => api.put(`/metodos-pago/${id}`, data),

  toggle: (id) => api.patch(`/metodos-pago/${id}/toggle`)
};
