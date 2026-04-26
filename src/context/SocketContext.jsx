import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe ser usado dentro de SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [usuariosConectados, setUsuariosConectados] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('❌ No hay token, no se conectará socket');
      return;
    }

    // Crear conexión de socket
    const newSocket = io('http://localhost:5000/', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Evento de conexión exitosa
    newSocket.on('connect', () => {
      console.log('✅ Socket conectado:', newSocket.id);
      setConnected(true);
      toast.success('Conexión en tiempo real establecida', {
        position: 'bottom-right',
        autoClose: 2000
      });
    });

    // Evento de desconexión
    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    // Error de conexión
    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión socket:', error.message);
      setConnected(false);
    });

    // Usuarios conectados
    newSocket.on('usuarios_conectados', (usuarios) => {
      console.log('👥 Usuarios conectados:', usuarios.length);
      setUsuariosConectados(usuarios);
    });

    // ========================================
    // EVENTOS DE VENTAS
    // ========================================

    // Nuevo pedido (para despensadores)
    newSocket.on('pedido_nuevo', (data) => {
      console.log('🔔 Nuevo pedido recibido:', data);
      
      toast.info(
        <div>
          <strong>🦴 Nuevo Pedido</strong>
          <p className="mb-0">{data.mensaje}</p>
          <small>Cliente: {data.venta.nombre_cliente}</small>
        </div>,
        {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        }
      );

      // Reproducir sonido de notificación
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
      } catch (error) {
        console.log('Error al reproducir sonido:', error);
      }
    });


    // Estado de pedido actualizado
    
    /*newSocket.on('estado_pedido_actualizado', (data) => {
      console.log('🔄 Estado actualizado:', data);
      
      const mensajes = {
        'PENDIENTE': '⏳ Pedido pendiente',
        'EN_PROCESO': '👨‍🍳 Pedido en preparación',
        'COMPLETADA': '✅ Pedido completado',
        'CANCELADA': '❌ Pedido cancelado'
      };

      toast.info(mensajes[data.estado_venta] || 'Estado actualizado', {
        position: 'bottom-right',
        autoClose: 3000
      });
    }); */

    // Pedido aceptado
    newSocket.on('pedido_aceptado', (data) => {
      console.log('✅ Pedido aceptado:', data);
      
      toast.success(`👨‍🍳 ${data.despensador} aceptó el pedido`, {
        position: 'bottom-right',
        autoClose: 3000
      });
    });

    // Pedido completado
    newSocket.on('pedido_completado', (data) => {
      console.log('🦴 Pedido completado:', data);
      
      toast.success(
        <div>
          <strong>🦴 Pedido Listo</strong>
          <p className="mb-0">{data.numero_factura}</p>
        </div>,
        {
          position: 'top-center',
          autoClose: 5000
        }
      );
    });

    // ========================================
    // EVENTOS DE INVENTARIO
    // ========================================

    // Alerta de inventario
    newSocket.on('alerta_inventario', (data) => {
      console.log('⚠️ Alerta de inventario:', data);
      
      toast.warning(
        <div>
          <strong>⚠️ Stock Bajo</strong>
          <p className="mb-0">{data.item.nombre}</p>
        </div>,
        {
          position: 'top-right',
          autoClose: 5000
        }
      );
    });

    // Stock actualizado
    newSocket.on('stock_actualizado', (data) => {
      console.log('📊 Stock actualizado:', data);
    });

    // ========================================
    // EVENTOS DE CAJA
    // ========================================

    // Notificación de caja
    newSocket.on('notificacion_caja', (data) => {
      console.log('💰 Notificación de caja:', data);
      
      if (data.tipo === 'APERTURA') {
        toast.info('💰 Caja abierta', {
          position: 'bottom-right',
          autoClose: 3000
        });
      } else if (data.tipo === 'CIERRE') {
        toast.info('🔒 Caja cerrada', {
          position: 'bottom-right',
          autoClose: 3000
        });
      }
    });

    // ========================================
    // EVENTOS GENERALES
    // ========================================

    // Mensaje recibido
    newSocket.on('mensaje_recibido', (data) => {
      console.log('💬 Mensaje recibido:', data);
      
      toast.info(
        <div>
          <strong>{data.de} ({data.rol})</strong>
          <p className="mb-0">{data.mensaje}</p>
        </div>,
        {
          position: 'bottom-left',
          autoClose: 4000
        }
      );
    });

    // Nueva notificación
    newSocket.on('nueva_notificacion', (data) => {
      console.log('🔔 Nueva notificación:', data);
      
      toast.info(
        <div>
          <strong>{data.tipo}</strong>
          <p className="mb-0">{data.mensaje}</p>
          <small>De: {data.de}</small>
        </div>,
        {
          position: 'top-right',
          autoClose: 4000
        }
      );
    });

    // Error de socket
    newSocket.on('error_socket', (data) => {
      console.error('❌ Error socket:', data);
      toast.error(data.mensaje, {
        position: 'top-center',
        autoClose: 5000
      });
    });

    setSocket(newSocket);

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Desconectando socket...');
      newSocket.disconnect();
    };
  }, []);

  // Funciones helper para emitir eventos
  const emitirNuevaVenta = (venta) => {
    if (socket && connected) {
      console.log('📡 Emitiendo nueva_venta:', venta);
      socket.emit('nueva_venta', venta);
    }
  };

  const emitirCambioEstado = (id_venta, estado_venta) => {
    if (socket && connected) {
      console.log('📡 Emitiendo cambiar_estado_pedido:', { id_venta, estado_venta });
      socket.emit('cambiar_estado_pedido', { id_venta, estado_venta });
    }
  };

  const emitirAceptarPedido = (id_venta) => {
    if (socket && connected) {
      console.log('📡 Emitiendo aceptar_pedido:', id_venta);
      socket.emit('aceptar_pedido', { id_venta });
    }
  };

  const emitirPedidoListo = (id_venta, numero_factura) => {
    if (socket && connected) {
      console.log('📡 Emitiendo pedido_listo:', { id_venta, numero_factura });
      socket.emit('pedido_listo', { id_venta, numero_factura });
    }
  };

  const emitirInventarioBajo = (item) => {
    if (socket && connected) {
      socket.emit('inventario_bajo', item);
    }
  };

  const emitirActualizarStock = (data) => {
    if (socket && connected) {
      socket.emit('actualizar_stock', data);
    }
  };

  const value = {
    socket,
    connected,
    usuariosConectados,
    emitirNuevaVenta,
    emitirCambioEstado,
    emitirAceptarPedido,
    emitirPedidoListo,
    emitirInventarioBajo,
    emitirActualizarStock
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;