import api from "../axiosConfig";

export const ventasService = {
  // Crear venta
  create: (ventaData) => {
    return api.post("/ventas", ventaData);
  },

  // Listar ventas
  getAll: (params = {}) => {
    return api.get("/ventas", { params });
  },

  // Obtener venta por ID
  getById: (id) => {
    return api.get(`/ventas/${id}`);
  },

  // Cambiar estado de venta
  cambiarEstado: (id, estado_venta) => {
    return api.put(`/ventas/${id}/estado`, {
      estado_venta,
    });
  },
};
