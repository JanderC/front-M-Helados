import api from "../axiosConfig";

export const authService = {
  // Login nuevo
  login: (username, password) => {
    return api.post("/auth/login", { username, password });
  },

  // Verificar token
  verifyToken: () => {
    return api.get("/auth/verify");
  },

  // Cambiar contraseña
  changePassword: (passwordActual, passwordNueva) => {
    return api.put("/auth/change-password", {
      passwordActual,
      passwordNueva,
    });
  },
};
