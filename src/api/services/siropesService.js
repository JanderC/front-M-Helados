import api from '../axiosConfig';

export const siropesService = {
  // Listar todos los siropes
  getAll: (params = {}) => {
    return api.get('/siropes', { params });
  },

  // Obtener un sirope por ID
  getById: (id) => {
    return api.get(`/siropes/${id}`);
  },

  // Crear sirope
  create: (siropeData) => {
    return api.post('/siropes', siropeData);
  },

  // Actualizar sirope
  update: (id, siropeData) => {
    return api.put(`/siropes/${id}`, siropeData);
  },

  // Eliminar sirope
  delete: (id) => {
    return api.delete(`/siropes/${id}`);
  },

  // Ajustar stock
  ajustarStock: (id, data) => {
    return api.post(`/siropes/${id}/ajustar-stock`, data);
  }
};