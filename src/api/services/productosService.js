import api from '../axiosConfig';

export const productosService = {
  // Listar todos los productos
  getAll: (params = {}) => {
    return api.get('/productos', { params });
  },

  // Obtener un producto por ID
  getById: (id) => {
    return api.get(`/productos/${id}`);
  },

  // Crear producto
  create: (productoData) => {
    return api.post('/productos', productoData);
  },

  // Actualizar producto
  update: (id, productoData) => {
    return api.put(`/productos/${id}`, productoData);
  },

  // Eliminar producto
  delete: (id) => {
    return api.delete(`/productos/${id}`);
  },

  // Obtener categorías
  getCategorias: () => {
    return api.get('/productos/categorias');
  },

  // Subir imagen (si tu backend lo soporta)
  uploadImage: (id, formData) => {
    return api.post(`/productos/${id}/imagen`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};