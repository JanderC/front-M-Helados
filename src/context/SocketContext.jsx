import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Conectar al servidor de sockets
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://back-backend-m-helados-production.up.railway.app';
      
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket conectado:', newSocket.id);
        setConnected(true);
        
        // Unirse a sala según rol
        if (user.rol === 'DESPENSADOR') {
          newSocket.emit('join-despensador');
        } else if (user.rol === 'ADMINISTRADOR') {
          newSocket.emit('join-admin');
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket desconectado');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error('Error en conexión en tiempo real');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    connected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};