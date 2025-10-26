import api from '../axiosConfig';

export const clientesService = {
  // Obtener todos los clientes
  getAll: (params = {}) => {
    return api.get('/clientes', { params });
  },

  // Obtener cliente por ID
  getById: (id) => {
    return api.get(`/clientes/${id}`);
  },

  // Crear cliente
  create: (data) => {
    return api.post('/clientes', data);
  },

  // Actualizar cliente
  update: (id, data) => {
    return api.put(`/clientes/${id}`, data);
  },

  // Eliminar cliente
  delete: (id) => {
    return api.delete(`/clientes/${id}`);
  },

  // Buscar clientes
  search: (searchTerm) => {
    return api.get('/clientes', { params: { search: searchTerm } });
  }
};