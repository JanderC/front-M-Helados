import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { authService } from "../api/services/authService";
import { toast } from "react-toastify";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);

        // Verificar si el token expiró
        if (decoded.exp * 1000 < Date.now()) {
          logout();
          return;
        }

        // Verificar token con el backend
        const response = await authService.verifyToken();
        setUser(response.data.data.usuario);
      } catch (error) {
        console.error("Error al verificar token:", error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);

      // Verificar que la respuesta sea exitosa
      if (response.data.success) {
        const { token, usuario } = response.data.data;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(usuario));
        setUser(usuario);

        toast.success(`¡Bienvenido ${usuario.nombre_completo}!`);
        return { success: true };
      } else {
        // Si success es false pero no lanzó error
        const message = response.data.message || "Error al iniciar sesión";
        toast.error(message);
        return { success: false, error: message };
      }
    } catch (error) {
      console.error("Error en login:", error);
      console.error("Error response:", error.response);

      // Mejorar el mensaje de error
      let message = "Error al iniciar sesión";

      if (error.response) {
        // El servidor respondió con un código de error
        if (error.response.status === 401) {
          message = "Usuario o contraseña incorrectos";
        } else if (error.response.data?.message) {
          message = error.response.data.message;
        }
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        message = "No se pudo conectar con el servidor";
      }

      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.info("Sesión cerrada");
  };

  const changePassword = async (passwordActual, passwordNuevo) => {
    try {
      await authService.changePassword(passwordActual, passwordNuevo);
      toast.success("Contraseña actualizada correctamente");
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message || "Error al cambiar contraseña";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.rol === "ADMINISTRADOR",
    isDespensador: user?.rol === "DESPENSADOR",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
