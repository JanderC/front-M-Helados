import api from '../axiosConfig';

export const saboresService = {
  // Obtener todos los sabores
  getAll: (params = {}) => {
    return api.get('/sabores', { params });
  },

  // Obtener sabor por ID
  getById: (id) => {
    return api.get(`/sabores/${id}`);
  },

  // Crear sabor
  create: (data) => {
    return api.post('/sabores', data);
  },

  // Actualizar sabor
  update: (id, data) => {
    return api.put(`/sabores/${id}`, data);
  },

  // Eliminar sabor
  delete: (id) => {
    return api.delete(`/sabores/${id}`);
  }
};