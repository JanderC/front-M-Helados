import api from '../axiosConfig';

export const toppingsService = {
  // Listar todos los toppings
  getAll: (params = {}) => {
    return api.get('/toppings', { params });
  },

  // Obtener un topping por ID
  getById: (id) => {
    return api.get(`/toppings/${id}`);
  },

  // Crear topping
  create: (toppingData) => {
    return api.post('/toppings', toppingData);
  },

  // Actualizar topping
  update: (id, toppingData) => {
    return api.put(`/toppings/${id}`, toppingData);
  },

  // Eliminar topping
  delete: (id) => {
    return api.delete(`/toppings/${id}`);
  },

  // Ajustar stock
  ajustarStock: (id, data) => {
  return api.post(`/toppings/${id}/ajustar-stock`, data);
}
};