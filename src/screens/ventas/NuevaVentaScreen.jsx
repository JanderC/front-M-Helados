import { useState, useEffect } from "react";
import { productosService } from "../../api/services/productosService";
import { toppingsService } from "../../api/services/toppingsService";
import { saboresService } from "../../api/services/saboresService";
import { siropesService } from "../../api/services/siropesService";
import { ventasService } from "../../api/services/ventasService";
import { monedasService } from "../../api/services/monedasService";
import { clientesService } from "../../api/services/clientesService";
import { toast } from "react-toastify";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import DetalleVentaModal from "../../components/ventas/DetalleVentaModal";
import { useSocket } from "../../context/SocketContext";
import { Badge } from "react-bootstrap";

const COLORES_ESTADO = {
  COMPLETADA: "#10b981",
  EN_PROCESO: "#f59e0b",
  PENDIENTE: "#6366f1",
  CANCELADA: "#ef4444",
  DEVUELTA: "#8b5cf6",
};

const NuevaVentaScreen = () => {
  const [productos, setProductos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [sabores, setSabores] = useState([]);
  const [siropes, setSiropes] = useState([]);
  const [tasas, setTasas] = useState({ USD: 1, VES: 36, COP: 4000 });
  const [monedas, setMonedas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState("COP");
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [mostrarVuelto, setMostrarVuelto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  // Estado para el modal táctil de extras (reemplaza el select nativo expandible)
  const [extrasModal, setExtrasModal] = useState(null); // { itemId, tab: 'sabores'|'toppings'|'siropes' }

  const { connected, emitirNuevaVenta } = useSocket();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nombreCliente.length >= 2 && !clienteSeleccionado) {
        buscarClientes(nombreCliente);
      } else {
        setClientesEncontrados([]);
        setMostrarSugerencias(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [nombreCliente, clienteSeleccionado]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodR, toppR, sabR, sirR, tasR, catR, ventR] = await Promise.all([
        productosService.getAll(),
        toppingsService.getAll(),
        saboresService.getAll({ disponible: "true" }),
        siropesService.getAll({ disponible: "true" }),
        monedasService.getTasas(),
        productosService.getCategorias(),
        ventasService.getAll({ limit: 10 }),
      ]);
      setProductos(prodR.data?.data || prodR.data || []);
      setToppings(toppR.data?.data || toppR.data || []);
      setSabores(sabR.data?.data || sabR.data || []);
      setSiropes(sirR.data?.data || sirR.data || []);
      const monedasData = tasR.data?.data || tasR.data;
      if (Array.isArray(monedasData)) {
        setMonedas(monedasData);
        const t = {};
        monedasData.forEach((m) => { t[m.codigo_moneda] = parseFloat(m.tasa_cambio_usd); });
        setTasas(t);
      } else {
        setTasas(monedasData || { USD: 1, VES: 36, COP: 4000 });
      }
      setCategorias(catR.data?.data || catR.data || []);
      setVentasRecientes(ventR.data?.data || ventR.data || []);
    } catch (e) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const buscarClientes = async (termino) => {
    try {
      setBuscandoCliente(true);
      const r = await clientesService.search(termino);
      const cl = r.data?.data || r.data || [];
      setClientesEncontrados(cl);
      setMostrarSugerencias(cl.length > 0);
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setNombreCliente(c.nombre_cliente);
    setClientesEncontrados([]);
    setMostrarSugerencias(false);
  };

  const limpiarCliente = () => {
    setClienteSeleccionado(null);
    setNombreCliente("");
    setClientesEncontrados([]);
    setMostrarSugerencias(false);
  };

  const agregarAlCarrito = (producto) => {
    if (!producto.disponible) { toast.error("Producto no disponible"); return; }
    // Siempre crea un ítem separado para poder personalizar cada unidad individualmente
    setCarrito(prev => [...prev, {
      id: Date.now() + Math.random(), // evita colisión si se toca muy rápido
      id_producto: producto.id_producto,
      nombre: producto.nombre_producto,
      precio_cop: parseFloat(producto.precio_base),
      precio_usd: parseFloat(producto.precio_usd || 0),
      cantidad: 1,
      toppings: [],
      sabores: [],
      siropes: [],
      imagenUrl: producto.imagen_url,
    }]);
    if (window.innerWidth < 992) setCarritoAbierto(true);
  };

  const agregarTopping = (itemId, topping) => {
    setCarrito(carrito.map((item) => {
      if (item.id !== itemId) return item;
      if (item.toppings.find((t) => t.id_topping === topping.id_topping)) { toast.warning("Topping ya agregado"); return item; }
      return { ...item, toppings: [...item.toppings, { id_topping: topping.id_topping, nombre: topping.nombre_topping, precio_cop: parseFloat(topping.precio_adicional_cop || 0), precio_usd: parseFloat(topping.precio_adicional_usd || 0) }] };
    }));
  };

  const agregarSabor = (itemId, sabor) => {
    setCarrito(carrito.map((item) => {
      if (item.id !== itemId) return item;
      if (item.sabores.find((s) => s.id_sabor === sabor.id_sabor)) { toast.warning("Sabor ya agregado"); return item; }
      return { ...item, sabores: [...item.sabores, { id_sabor: sabor.id_sabor, nombre: sabor.nombre_sabor, precio_cop: parseFloat(sabor.precio_adicional_cop || sabor.precio_adicional || 0), precio_usd: parseFloat(sabor.precio_adicional_usd || 0) }] };
    }));
  };

  const agregarSirope = (itemId, sirope) => {
    setCarrito(carrito.map((item) => {
      if (item.id !== itemId) return item;
      if (item.siropes.find((s) => s.id_sirope === sirope.id_sirope)) { toast.warning("Sirope ya agregado"); return item; }
      return { ...item, siropes: [...item.siropes, { id_sirope: sirope.id_sirope, nombre: sirope.nombre_sirope, precio_cop: parseFloat(sirope.precio_adicional_cop || 0), precio_usd: parseFloat(sirope.precio_adicional_usd || 0) }] };
    }));
  };

  const removerTopping = (itemId, id) => setCarrito(carrito.map((i) => i.id === itemId ? { ...i, toppings: i.toppings.filter((t) => t.id_topping !== id) } : i));
  const removerSabor = (itemId, id) => setCarrito(carrito.map((i) => i.id === itemId ? { ...i, sabores: i.sabores.filter((s) => s.id_sabor !== id) } : i));
  const removerSirope = (itemId, id) => setCarrito(carrito.map((i) => i.id === itemId ? { ...i, siropes: i.siropes.filter((s) => s.id_sirope !== id) } : i));
  const actualizarCantidad = (itemId, n) => { if (n < 1) return; setCarrito(carrito.map((i) => i.id === itemId ? { ...i, cantidad: n } : i)); };
  const removerDelCarrito = (itemId) => {
    setCarrito(carrito.filter((i) => i.id !== itemId));
    if (extrasModal?.itemId === itemId) setExtrasModal(null);
  };

  const getPrecioItem = (item, cop, usd) => {
    if (monedaSeleccionada === "COP") return item[cop] || 0;
    if (monedaSeleccionada === "USD") return item[usd] || 0;
    return (item[usd] || 0) * tasas["VES"];
  };

  const calcularSubtotal = (item) => {
    let b, t, s, sr;
    if (monedaSeleccionada === "COP") {
      b = item.precio_cop; t = item.toppings.reduce((a, x) => a + x.precio_cop, 0); s = item.sabores.reduce((a, x) => a + x.precio_cop, 0); sr = item.siropes.reduce((a, x) => a + x.precio_cop, 0);
    } else if (monedaSeleccionada === "USD") {
      b = item.precio_usd; t = item.toppings.reduce((a, x) => a + x.precio_usd, 0); s = item.sabores.reduce((a, x) => a + x.precio_usd, 0); sr = item.siropes.reduce((a, x) => a + x.precio_usd, 0);
    } else {
      b = item.precio_usd * tasas["VES"]; t = item.toppings.reduce((a, x) => a + x.precio_usd * tasas["VES"], 0); s = item.sabores.reduce((a, x) => a + x.precio_usd * tasas["VES"], 0); sr = item.siropes.reduce((a, x) => a + x.precio_usd * tasas["VES"], 0);
    }
    return (b + t + s + sr) * item.cantidad;
  };

  const totalCOP = carrito.reduce((tot, i) => tot + (i.precio_cop + i.toppings.reduce((a, t) => a + t.precio_cop, 0) + i.sabores.reduce((a, s) => a + s.precio_cop, 0) + i.siropes.reduce((a, s) => a + s.precio_cop, 0)) * i.cantidad, 0);
  const totalUSD = carrito.reduce((tot, i) => tot + (i.precio_usd + i.toppings.reduce((a, t) => a + t.precio_usd, 0) + i.sabores.reduce((a, s) => a + s.precio_usd, 0) + i.siropes.reduce((a, s) => a + s.precio_usd, 0)) * i.cantidad, 0);
  const totalMoneda = monedaSeleccionada === "COP" ? totalCOP : monedaSeleccionada === "USD" ? totalUSD : totalUSD * (tasas["VES"] || 1);

  const procesarVenta = async () => {
    if (carrito.length === 0) { toast.warning("El carrito está vacío"); return; }
    try {
      setProcesando(true);
      const monedaObj = monedas.find((m) => m.codigo_moneda === monedaSeleccionada);
      if (!monedaObj) { toast.error("Error al obtener información de moneda"); return; }
      const detalles = carrito.map((item) => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: getPrecioItem(item, "precio_cop", "precio_usd"),
        toppings: item.toppings.map((t) => ({ id_topping: t.id_topping, cantidad: item.cantidad, precio_unitario: getPrecioItem(t, "precio_cop", "precio_usd") })),
        sabores: item.sabores.map((s) => ({ id_sabor: s.id_sabor, cantidad: item.cantidad, precio_unitario: getPrecioItem(s, "precio_cop", "precio_usd") })),
        siropes: item.siropes.map((s) => ({ id_sirope: s.id_sirope, cantidad: item.cantidad, precio_unitario: getPrecioItem(s, "precio_cop", "precio_usd") })),
      }));
      const ventaData = { nombre_cliente: nombreCliente.trim() || null, id_cliente: clienteSeleccionado?.id_cliente || null, id_moneda: monedaObj.id_moneda, monto_total: totalMoneda, productos: detalles };
      const response = await ventasService.create(ventaData);
      toast.success("¡Venta procesada correctamente!");
      if (connected && response.data?.data) {
        const vc = response.data.data;
        emitirNuevaVenta({ id_venta: vc.id_venta, numero_factura: vc.numero_factura, nombre_cliente: vc.nombre_cliente || "Cliente General", total: vc.total, codigo_moneda: vc.codigo_moneda || monedaSeleccionada, estado_venta: "PENDIENTE", fecha_venta: new Date(), cantidad_items: carrito.length });
      }
      const vc = response.data?.data;
      if (vc?.id_venta) { setVentaSeleccionada(vc.id_venta); setShowDetalleModal(true); }
      setCarrito([]); limpiarCliente(); setMontoRecibido(""); setMostrarVuelto(false); setCarritoAbierto(false); setExtrasModal(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al procesar venta");
    } finally {
      setProcesando(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    if (filtroCategoria && p.id_categoria !== parseInt(filtroCategoria)) return false;
    return p.disponible;
  });

  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

  // Helpers de precio en modal extras
  const getPrecioExtra = (extra, tipoCop, tipoUsd) => {
    if (monedaSeleccionada === "COP") return parseFloat(extra[tipoCop] || 0);
    if (monedaSeleccionada === "USD") return parseFloat(extra[tipoUsd] || 0);
    return parseFloat(extra[tipoUsd] || 0) * tasas["VES"];
  };

  // Item activo en el modal de extras
  const itemExtras = extrasModal ? carrito.find(i => i.id === extrasModal.itemId) : null;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes melt { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.15); } }
        `}</style>
        <div style={{ fontSize: 48, animation: "melt 1.5s ease infinite" }}>🍦</div>
        <p style={{ color: "#7B2FBE", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Cargando productos...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ===== NUEVA VENTA SCREEN ===== */
        .nv-container {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .nv-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0 12px;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 8px;
        }
        .nv-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          color: #1a0a2e;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nv-title-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1rem;
          box-shadow: 0 4px 14px rgba(123,47,190,0.4);
          flex-shrink: 0;
        }
        .nv-controls {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }

        .moneda-tabs {
          display: flex;
          background: rgba(123,47,190,0.08);
          border-radius: 12px;
          padding: 3px;
          gap: 2px;
        }
        .moneda-tab {
          padding: 6px 14px;
          border-radius: 9px;
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.8rem;
          color: #9580b0;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .moneda-tab.active {
          background: #fff;
          color: #7B2FBE;
          box-shadow: 0 2px 8px rgba(123,47,190,0.15);
        }

        .tasa-pill {
          background: rgba(125,232,216,0.15);
          border: 1px solid rgba(125,232,216,0.3);
          color: #0e6b60;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }

        .status-dot-sm {
          width: 8px; height: 8px; border-radius: 50%;
          display: inline-block;
        }
        .status-dot-sm.on { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.2); animation: pulse-sm 2s infinite; }
        .status-dot-sm.off { background: #ef4444; }
        @keyframes pulse-sm { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        .nv-layout {
          display: grid;
          grid-template-columns: 1fr 520px;
          gap: 16px;
          align-items: start;
        }

        .nv-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .cat-chip {
          padding: 10px 18px;
          border-radius: 999px;
          border: 1.5px solid rgba(123,47,190,0.15);
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.88rem;
          color: #5a4a72;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          min-height: 44px;
        }
        .cat-chip:hover, .cat-chip.active {
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 14px rgba(123,47,190,0.35);
          transform: translateY(-1px);
        }

        .productos-scroll {
          min-height: 0;
          padding-bottom: 8px;
        }

        .productos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }

        .producto-card {
          background: #fff;
          border-radius: 16px;
          border: 2px solid transparent;
          overflow: visible;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(123,47,190,0.06);
          position: relative;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          display: flex;
          flex-direction: column;
        }
        .producto-card:hover, .producto-card:active {
          border-color: #7B2FBE;
          box-shadow: 0 8px 24px rgba(123,47,190,0.2);
          transform: translateY(-3px);
        }
        .producto-card:active { transform: scale(0.97); }
        .producto-img {
          width: 100%;
          aspect-ratio: 4/3;
          object-fit: cover;
          background: linear-gradient(135deg, #f5f0fb, #ede4f8);
        }
        .producto-img-placeholder {
          width: 100%;
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, #f5f0fb, #ede4f8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.6rem, 4vw, 2.2rem);
        }
        .producto-body {
          padding: 12px 14px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #fff;
          border-radius: 0 0 14px 14px;
        }
        .producto-nombre {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: #1a0a2e;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.1em;
        }
        .producto-precio {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.05rem;
          color: #7B2FBE;
          margin-top: 2px;
        }
        .producto-add-btn {
          margin-top: 8px;
          width: 100%;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border: none;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(123,47,190,0.35);
          transition: all 0.18s;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          flex-shrink: 0;
        }
        .producto-add-btn:hover { filter: brightness(1.1); box-shadow: 0 5px 16px rgba(123,47,190,0.45); }
        .producto-add-btn:active { transform: scale(0.95); }

        /* ─────────────── Panel carrito ─────────────── */
        .carrito-panel {
          background: #fff;
          border-radius: 20px;
          border: 1px solid rgba(123,47,190,0.1);
          box-shadow: 0 4px 24px rgba(123,47,190,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 80px);
        }

        .carrito-header {
          background: linear-gradient(135deg, #5E1F96, #7B2FBE);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .carrito-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          color: #fff;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .carrito-badge {
          background: #7DE8D8;
          color: #1a0a2e;
          border-radius: 999px;
          padding: 3px 12px;
          font-size: 0.8rem;
          font-weight: 800;
        }

        /* Campo cliente */
        .cliente-section {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(123,47,190,0.08);
          flex-shrink: 0;
          position: relative;
        }
        .cliente-label {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9580b0;
          margin-bottom: 6px;
        }
        .cliente-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f5f0fb;
          border-radius: 10px;
          border: 1.5px solid rgba(123,47,190,0.12);
          padding: 10px 12px;
          transition: border-color 0.2s;
        }
        .cliente-input-wrap:focus-within { border-color: #7B2FBE; background: #fff; }
        .cliente-input {
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          color: #1a0a2e;
          flex: 1;
          outline: none;
        }
        .cliente-input::placeholder { color: #c4b0d8; }
        .cliente-clear-btn {
          background: none; border: none; color: #9580b0; cursor: pointer;
          padding: 2px; display: flex; align-items: center; font-size: 1rem;
        }
        .cliente-selected-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(16,185,129,0.1); color: #10b981;
          border: 1px solid rgba(16,185,129,0.2); border-radius: 6px;
          padding: 2px 8px; font-size: 0.72rem; font-weight: 600; margin-top: 4px;
        }
        .sugerencias-list {
          position: absolute; left: 14px; right: 14px; top: calc(100% - 4px);
          background: #fff; border-radius: 12px;
          border: 1.5px solid rgba(123,47,190,0.15);
          box-shadow: 0 12px 40px rgba(123,47,190,0.15);
          z-index: 1000; overflow: hidden;
          animation: drop-in 0.15s ease;
        }
        @keyframes drop-in { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
        .sugerencia-item {
          padding: 12px 14px; cursor: pointer; transition: background 0.15s;
          border-bottom: 1px solid rgba(123,47,190,0.06);
        }
        .sugerencia-item:last-child { border-bottom: none; }
        .sugerencia-item:hover { background: #f5f0fb; }
        .sugerencia-nombre { font-weight: 600; font-size: 0.9rem; color: #1a0a2e; }
        .sugerencia-tel { font-size: 0.75rem; color: #9580b0; }

        /* ─────────────── Items del carrito ─────────────── */
        .carrito-items {
          flex: 1; overflow-y: auto; padding: 10px 12px;
          min-height: 80px; max-height: 100%;
        }
        .carrito-items::-webkit-scrollbar { width: 3px; }
        .carrito-items::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.2); border-radius: 4px; }

        .carrito-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 40px 16px; color: #c4b0d8; text-align: center;
        }
        .carrito-empty-icon { font-size: 3.5rem; margin-bottom: 12px; opacity: 0.5; }
        .carrito-empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; }

        /* ─── Ítem del carrito — diseño compacto pero tactil ─── */
        .carrito-item {
          background: #f9f7fd;
          border-radius: 14px;
          padding: 12px 12px 10px;
          margin-bottom: 10px;
          border: 1.5px solid rgba(123,47,190,0.09);
          transition: all 0.2s;
        }
        .carrito-item:hover { border-color: rgba(123,47,190,0.22); }
        .carrito-item.has-extras { border-color: rgba(123,47,190,0.2); background: #f5f0fb; }

        .carrito-item-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .carrito-item-info { flex: 1; min-width: 0; }
        .carrito-item-nombre {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: #1a0a2e;
          line-height: 1.25;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .carrito-item-precio-unit {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          color: #9580b0;
          margin-top: 1px;
        }

        /* ─── Controles de cantidad — grandes y táctiles ─── */
        .qty-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .qty-btn {
          width: 40px; height: 40px;
          border-radius: 10px;
          border: 1.5px solid rgba(123,47,190,0.2);
          background: #fff;
          color: #7B2FBE;
          font-size: 1.4rem;
          font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        .qty-btn:hover { background: rgba(123,47,190,0.1); border-color: #7B2FBE; }
        .qty-btn:active { transform: scale(0.88); }
        .qty-num {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.2rem;
          color: #1a0a2e;
          min-width: 28px;
          text-align: center;
        }
        .item-delete-btn {
          background: rgba(239,68,68,0.08);
          border: none; border-radius: 10px; color: #ef4444;
          cursor: pointer; padding: 0;
          font-size: 1.05rem;
          transition: all 0.15s;
          flex-shrink: 0;
          touch-action: manipulation;
          min-width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
        }
        .item-delete-btn:hover { background: rgba(239,68,68,0.16); }
        .item-delete-btn:active { transform: scale(0.9); }

        /* Subtotal del ítem */
        .item-subtotal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(123,47,190,0.08);
        }
        /* Botón de extras — GRANDE y visible */
        .extras-trigger-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(123,47,190,0.07);
          border: 1.5px dashed rgba(123,47,190,0.25);
          color: #7B2FBE;
          border-radius: 10px;
          padding: 7px 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          touch-action: manipulation;
          transition: all 0.15s;
          white-space: nowrap;
          min-height: 38px;
        }
        .extras-trigger-btn:hover { background: rgba(123,47,190,0.12); border-color: #7B2FBE; }
        .extras-trigger-btn.has-extras {
          background: rgba(123,47,190,0.12);
          border-style: solid;
          border-color: #7B2FBE;
        }
        .item-subtotal {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.15rem;
          color: #7B2FBE;
        }

        /* Tags de extras (compactos, sólo para mostrar lo seleccionado) */
        .extras-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
        .extra-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 9px; border-radius: 8px;
          font-size: 0.78rem; font-weight: 700; cursor: pointer;
          transition: all 0.15s; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          min-height: 32px; border: 1.5px solid transparent;
          font-family: 'DM Sans', sans-serif;
        }
        .extra-tag.sabor { background: rgba(99,102,241,0.1); color: #5558e3; border-color: rgba(99,102,241,0.2); }
        .extra-tag.topping { background: rgba(245,158,11,0.1); color: #b45309; border-color: rgba(245,158,11,0.2); }
        .extra-tag.sirope { background: rgba(16,185,129,0.1); color: #059669; border-color: rgba(16,185,129,0.2); }
        .extra-tag:active { transform: scale(0.93); opacity: 0.7; }
        .extra-tag-x { font-size: 0.95rem; font-weight: 700; opacity: 0.6; line-height: 1; }

        /* ─────────────── MODAL TÁCTIL DE EXTRAS ─────────────── */
        .extras-overlay {
          position: fixed; inset: 0;
          background: rgba(26,10,46,0.55);
          backdrop-filter: blur(5px);
          z-index: 2000;
          display: flex; align-items: flex-end;
          animation: fade-in 0.15s ease;
        }
        @keyframes fade-in { from { opacity:0; } to { opacity:1; } }
        .extras-sheet {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          background: #fff;
          border-radius: 24px 24px 0 0;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          overflow: hidden;
          animation: slide-up 0.25s cubic-bezier(0.4,0,0.2,1);
          max-height: 88vh;
          display: flex;
          flex-direction: column;
        }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .extras-sheet-handle {
          width: 44px; height: 5px;
          background: rgba(123,47,190,0.2);
          border-radius: 99px;
          margin: 14px auto 0;
          flex-shrink: 0;
        }
        .extras-sheet-header {
          padding: 14px 18px 0;
          flex-shrink: 0;
        }
        .extras-sheet-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 1.1rem; color: #1a0a2e;
          display: flex; align-items: center; justify-content: space-between;
        }
        .extras-sheet-subtitle {
          font-size: 0.8rem; color: #9580b0; font-family: 'DM Sans', sans-serif;
          font-weight: 600; margin-top: 2px;
        }
        .extras-sheet-close {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(123,47,190,0.08); border: none;
          color: #7B2FBE; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
          touch-action: manipulation;
        }
        .extras-sheet-close:active { transform: scale(0.92); }

        /* Tabs de sección (Sabores / Toppings / Siropes) */
        .extras-tabs {
          display: flex; gap: 6px; padding: 14px 18px 0;
          flex-shrink: 0; overflow-x: auto;
        }
        .extras-tabs::-webkit-scrollbar { display: none; }
        .extras-tab-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 999px;
          border: 2px solid rgba(123,47,190,0.12);
          background: #f9f7fd; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-weight: 700;
          font-size: 0.88rem; color: #5a4a72;
          white-space: nowrap; touch-action: manipulation;
          transition: all 0.18s; min-height: 44px;
          -webkit-tap-highlight-color: transparent;
        }
        .extras-tab-btn.active-sabor { background: rgba(99,102,241,0.1); border-color: #6366f1; color: #4f46e5; }
        .extras-tab-btn.active-toppings { background: rgba(245,158,11,0.1); border-color: #f59e0b; color: #b45309; }
        .extras-tab-btn.active-siropes { background: rgba(16,185,129,0.1); border-color: #10b981; color: #059669; }
        .extras-tab-count {
          background: currentColor; color: #fff;
          border-radius: 999px; min-width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 800; padding: 0 4px;
          opacity: 0.85;
        }
        .extras-tab-btn:not(.active-sabor):not(.active-toppings):not(.active-siropes) .extras-tab-count {
          background: rgba(123,47,190,0.15); color: #7B2FBE; opacity: 1;
        }

        /* Grid de opciones táctiles — BOTONES GRANDES */
        .extras-options-scroll {
          flex: 1; overflow-y: auto; padding: 14px 18px 20px;
        }
        .extras-options-scroll::-webkit-scrollbar { width: 3px; }
        .extras-options-scroll::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.15); border-radius: 4px; }

        .extras-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px;
        }
        /* Cada opción: botón grande y cuadrado, fácil de tocar */
        .extra-option-btn {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px;
          padding: 14px 10px;
          border-radius: 14px;
          border: 2.5px solid rgba(123,47,190,0.1);
          background: #f9f7fd;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
          text-align: center;
          min-height: 90px;
          position: relative;
          user-select: none;
        }
        .extra-option-btn:active { transform: scale(0.94); }

        /* Variantes por tipo */
        .extra-option-btn.sabor { border-color: rgba(99,102,241,0.12); }
        .extra-option-btn.sabor:hover { border-color: #6366f1; background: rgba(99,102,241,0.06); }
        .extra-option-btn.sabor.selected { border-color: #6366f1; background: rgba(99,102,241,0.12); }

        .extra-option-btn.topping { border-color: rgba(245,158,11,0.15); }
        .extra-option-btn.topping:hover { border-color: #f59e0b; background: rgba(245,158,11,0.06); }
        .extra-option-btn.topping.selected { border-color: #f59e0b; background: rgba(245,158,11,0.12); }

        .extra-option-btn.sirope { border-color: rgba(16,185,129,0.15); }
        .extra-option-btn.sirope:hover { border-color: #10b981; background: rgba(16,185,129,0.06); }
        .extra-option-btn.sirope.selected { border-color: #10b981; background: rgba(16,185,129,0.1); }

        .extra-option-emoji { font-size: 1.8rem; line-height: 1; }
        .extra-option-nombre {
          font-weight: 700; font-size: 0.82rem; color: #1a0a2e;
          line-height: 1.25; word-break: break-word;
        }
        .extra-option-precio {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 0.75rem; color: #7B2FBE;
          background: rgba(123,47,190,0.08); border-radius: 999px;
          padding: 2px 8px; margin-top: 2px;
        }
        .extra-option-precio.gratis { color: #10b981; background: rgba(16,185,129,0.08); }

        /* Check de seleccionado */
        .extra-selected-check {
          position: absolute; top: 7px; right: 8px;
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 800; color: #fff;
        }
        .sabor .extra-selected-check { background: #6366f1; }
        .topping .extra-selected-check { background: #f59e0b; }
        .sirope .extra-selected-check { background: #10b981; }

        /* Footer del carrito */
        .carrito-footer {
          border-top: 2px solid rgba(123,47,190,0.08);
          padding: 14px 16px 16px;
          flex-shrink: 0;
          background: #fff;
        }
        .total-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .total-label {
          font-family: 'DM Sans', sans-serif; font-weight: 600;
          color: #5a4a72; font-size: 1rem;
        }
        .total-amount {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1.8rem; color: #1a0a2e;
        }

        .monto-section { margin-bottom: 12px; }
        .monto-label {
          font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 0.7rem;
          text-transform: uppercase; letter-spacing: 0.08em; color: #9580b0;
          margin-bottom: 5px; display: flex; align-items: center; gap: 4px;
        }
        .monto-input {
          width: 100%; background: #f5f0fb;
          border: 1.5px solid rgba(123,47,190,0.12); border-radius: 10px;
          padding: 11px 14px; font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 1.1rem; color: #1a0a2e; outline: none;
          transition: border-color 0.2s; box-sizing: border-box;
        }
        .monto-input:focus { border-color: #7B2FBE; background: #fff; }
        .monto-input::placeholder { color: #c4b0d8; font-weight: 400; font-size: 0.9rem; }

        .insuficiente-msg {
          display: flex; align-items: center; gap: 4px; color: #ef4444;
          font-size: 0.78rem; font-family: 'DM Sans', sans-serif;
          font-weight: 600; margin-top: 4px;
        }
        .vuelto-box {
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(16,185,129,0.08); border: 1.5px solid rgba(16,185,129,0.2);
          border-radius: 10px; padding: 10px 14px; margin-top: 6px;
        }
        .vuelto-label { font-family: 'DM Sans', sans-serif; font-weight: 700; color: #10b981; font-size: 0.95rem; }
        .vuelto-amount { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.6rem; color: #10b981; }

        .procesar-btn {
          width: 100%;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none; border-radius: 14px; color: #fff;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1rem; padding: 16px;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          box-shadow: 0 6px 20px rgba(16,185,129,0.4);
          transition: all 0.2s; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent; user-select: none;
        }
        .procesar-btn:hover:not(:disabled) { box-shadow: 0 8px 28px rgba(16,185,129,0.5); transform: translateY(-1px); filter: brightness(1.05); }
        .procesar-btn:active:not(:disabled) { transform: scale(0.98); }
        .procesar-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* FAB móvil */
        .carrito-fab {
          display: none;
          position: fixed; bottom: 24px; right: 24px;
          width: 64px; height: 64px; border-radius: 20px;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border: none; color: #fff; font-size: 1.5rem; cursor: pointer;
          box-shadow: 0 8px 28px rgba(123,47,190,0.5); z-index: 999;
          align-items: center; justify-content: center; touch-action: manipulation;
        }
        .carrito-fab-badge {
          position: absolute; top: -4px; right: -4px;
          background: #7DE8D8; color: #1a0a2e; border-radius: 999px;
          min-width: 22px; height: 22px; font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 0.72rem;
          display: flex; align-items: center; justify-content: center; padding: 0 4px;
        }

        .carrito-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(26,10,46,0.5); z-index: 1000; backdrop-filter: blur(4px);
        }
        .carrito-drawer {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; border-radius: 24px 24px 0 0; z-index: 1001;
          display: flex; flex-direction: column; max-height: 92vh;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden;
        }
        .carrito-drawer.open { transform: translateY(0); }
        .drawer-handle {
          width: 40px; height: 4px; background: rgba(123,47,190,0.2);
          border-radius: 4px; margin: 12px auto 4px; flex-shrink: 0;
        }

        /* Ventas recientes */
        .recientes-section { margin-top: 12px; flex-shrink: 0; }
        .recientes-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .recientes-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem; color: #1a0a2e; }
        .recientes-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
        .recientes-list::-webkit-scrollbar { width: 3px; }
        .recientes-list::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.2); border-radius: 4px; }
        .reciente-item {
          display: flex; align-items: center; gap: 10px; padding: 8px 12px;
          background: #f9f7fd; border-radius: 10px; border: 1px solid rgba(123,47,190,0.06);
          transition: background 0.15s;
        }
        .reciente-item:hover { background: #f0eaf8; }
        .reciente-factura { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.75rem; color: #7B2FBE; min-width: 80px; }
        .reciente-info { flex: 1; min-width: 0; }
        .reciente-cliente { font-size: 0.8rem; font-weight: 600; color: #1a0a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .reciente-fecha { font-size: 0.7rem; color: #9580b0; }
        .reciente-total { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.85rem; color: #1a0a2e; white-space: nowrap; }
        .estado-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ver-btn-sm {
          background: rgba(123,47,190,0.08); border: none; border-radius: 7px;
          color: #7B2FBE; cursor: pointer; padding: 6px 10px;
          font-size: 0.75rem; font-weight: 600; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s; white-space: nowrap; touch-action: manipulation;
          min-height: 36px;
        }
        .ver-btn-sm:hover { background: rgba(123,47,190,0.15); }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .nv-layout { grid-template-columns: 1fr; gap: 12px; }
          .carrito-panel { display: none; }
          .carrito-fab { display: flex !important; }
          .carrito-overlay { display: block; }
          .productos-grid { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)) gap: 12px; }
          .extras-sheet { max-width: 100%; }
        }
        @media (max-width: 576px) {
          .nv-topbar { padding: 6px 0 10px; }
          .moneda-tab { padding: 5px 10px; }
          .productos-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
          .producto-body { padding: 8px 10px; }
          .producto-nombre { font-size: 0.78rem; }
          .producto-precio { font-size: 0.88rem; }
          .extras-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
        }
        @media (min-width: 992px) {
          .carrito-fab { display: none !important; }
          .carrito-overlay { display: none !important; }
          .carrito-drawer { display: none !important; }
          /* En desktop el modal de extras aparece centrado */
          .extras-overlay { align-items: center; }
          .extras-sheet {
            border-radius: 20px;
            max-height: 80vh;
            margin: auto;
          }
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-sm {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>

      {/* ─── MODAL TÁCTIL DE EXTRAS ─── */}
      {extrasModal && itemExtras && (
        <div className="extras-overlay" onClick={() => setExtrasModal(null)}>
          <div className="extras-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="extras-sheet-handle" />
            <div className="extras-sheet-header">
              <div className="extras-sheet-title">
                <div>
                  <div>Personalizar pedido</div>
                  <div className="extras-sheet-subtitle">🛒 {itemExtras.nombre}</div>
                </div>
                <button className="extras-sheet-close" onClick={() => setExtrasModal(null)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="extras-tabs">
              {sabores.length > 0 && (
                <button
                  className={`extras-tab-btn ${extrasModal.tab === 'sabores' ? 'active-sabor' : ''}`}
                  onClick={() => setExtrasModal({ ...extrasModal, tab: 'sabores' })}
                >
                  🍓 Sabores
                  {itemExtras.sabores.length > 0 && (
                    <span className="extras-tab-count">{itemExtras.sabores.length}</span>
                  )}
                </button>
              )}
              {toppings.length > 0 && (
                <button
                  className={`extras-tab-btn ${extrasModal.tab === 'toppings' ? 'active-toppings' : ''}`}
                  onClick={() => setExtrasModal({ ...extrasModal, tab: 'toppings' })}
                >
                  🍫 Toppings
                  {itemExtras.toppings.length > 0 && (
                    <span className="extras-tab-count">{itemExtras.toppings.length}</span>
                  )}
                </button>
              )}
              {siropes.length > 0 && (
                <button
                  className={`extras-tab-btn ${extrasModal.tab === 'siropes' ? 'active-siropes' : ''}`}
                  onClick={() => setExtrasModal({ ...extrasModal, tab: 'siropes' })}
                >
                  🍯 Siropes
                  {itemExtras.siropes.length > 0 && (
                    <span className="extras-tab-count">{itemExtras.siropes.length}</span>
                  )}
                </button>
              )}
            </div>

            {/* Grid de opciones táctiles */}
            <div className="extras-options-scroll">
              {extrasModal.tab === 'sabores' && (
                <div className="extras-grid">
                  {sabores.map((s) => {
                    const seleccionado = !!itemExtras.sabores.find(x => x.id_sabor === s.id_sabor);
                    const precio = getPrecioExtra(s, 'precio_adicional_cop', 'precio_adicional_usd') ||
                                   getPrecioExtra(s, 'precio_adicional', 'precio_adicional_usd');
                    return (
                      <button
                        key={s.id_sabor}
                        className={`extra-option-btn sabor ${seleccionado ? 'selected' : ''}`}
                        onClick={() => {
                          if (seleccionado) removerSabor(extrasModal.itemId, s.id_sabor);
                          else agregarSabor(extrasModal.itemId, s);
                        }}
                      >
                        {seleccionado && <span className="extra-selected-check"><i className="bi bi-check-lg" /></span>}
                        <span className="extra-option-emoji">🍓</span>
                        <span className="extra-option-nombre">{s.nombre_sabor}</span>
                        <span className={`extra-option-precio ${precio <= 0 ? 'gratis' : ''}`}>
                          {precio > 0 ? `+${formatCurrency(precio, monedaSeleccionada)}` : 'Gratis'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {extrasModal.tab === 'toppings' && (
                <div className="extras-grid">
                  {toppings.map((t) => {
                    const seleccionado = !!itemExtras.toppings.find(x => x.id_topping === t.id_topping);
                    const precio = getPrecioExtra(t, 'precio_adicional_cop', 'precio_adicional_usd');
                    return (
                      <button
                        key={t.id_topping}
                        className={`extra-option-btn topping ${seleccionado ? 'selected' : ''}`}
                        onClick={() => {
                          if (seleccionado) removerTopping(extrasModal.itemId, t.id_topping);
                          else agregarTopping(extrasModal.itemId, t);
                        }}
                      >
                        {seleccionado && <span className="extra-selected-check"><i className="bi bi-check-lg" /></span>}
                        <span className="extra-option-emoji">🍫</span>
                        <span className="extra-option-nombre">{t.nombre_topping}</span>
                        <span className={`extra-option-precio ${precio <= 0 ? 'gratis' : ''}`}>
                          {precio > 0 ? `+${formatCurrency(precio, monedaSeleccionada)}` : 'Gratis'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {extrasModal.tab === 'siropes' && (
                <div className="extras-grid">
                  {siropes.map((s) => {
                    const seleccionado = !!itemExtras.siropes.find(x => x.id_sirope === s.id_sirope);
                    const precio = getPrecioExtra(s, 'precio_adicional_cop', 'precio_adicional_usd');
                    return (
                      <button
                        key={s.id_sirope}
                        className={`extra-option-btn sirope ${seleccionado ? 'selected' : ''}`}
                        onClick={() => {
                          if (seleccionado) removerSirope(extrasModal.itemId, s.id_sirope);
                          else agregarSirope(extrasModal.itemId, s);
                        }}
                      >
                        {seleccionado && <span className="extra-selected-check"><i className="bi bi-check-lg" /></span>}
                        <span className="extra-option-emoji">🍯</span>
                        <span className="extra-option-nombre">{s.nombre_sirope}</span>
                        <span className={`extra-option-precio ${precio <= 0 ? 'gratis' : ''}`}>
                          {precio > 0 ? `+${formatCurrency(precio, monedaSeleccionada)}` : 'Gratis'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="nv-container">
        {/* Topbar */}
        <div className="nv-topbar">
          <h2 className="nv-title">
            <div className="nv-title-icon">
              <i className="bi bi-cart-plus"></i>
            </div>
            Nueva Venta
          </h2>
          <div className="nv-controls">
            <span title={connected ? "Conectado" : "Desconectado"}>
              <span className={`status-dot-sm ${connected ? "on" : "off"}`}></span>
            </span>
            <div className="moneda-tabs">
              {["COP", "USD", "VES"].map((m) => (
                <button key={m} className={`moneda-tab ${monedaSeleccionada === m ? "active" : ""}`} onClick={() => setMonedaSeleccionada(m)}>
                  {m === "COP" ? "$ COP" : m === "USD" ? "$ USD" : "Bs."}
                </button>
              ))}
            </div>
            {tasas[monedaSeleccionada] && monedaSeleccionada !== "USD" && (
              <span className="tasa-pill">
                <i className="bi bi-graph-up me-1"></i>
                {tasas[monedaSeleccionada].toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Layout */}
        <div className="nv-layout">
          {/* Izquierda */}
          <div className="nv-left">
            <div className="filter-bar">
              <button className={`cat-chip ${filtroCategoria === "" ? "active" : ""}`} onClick={() => setFiltroCategoria("")}>
                🍦 Todos
              </button>
              {categorias.map((cat) => (
                <button key={cat.id_categoria} className={`cat-chip ${filtroCategoria === String(cat.id_categoria) ? "active" : ""}`} onClick={() => setFiltroCategoria(String(cat.id_categoria))}>
                  {cat.nombre_categoria}
                </button>
              ))}
            </div>

            <div className="productos-scroll">
              {productosFiltrados.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "#c4b0d8" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>🍨</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>No hay productos en esta categoría</div>
                </div>
              ) : (
                <div className="productos-grid">
                  {productosFiltrados.map((producto) => (
                    <div key={producto.id_producto} className="producto-card" onClick={() => agregarAlCarrito(producto)} role="button" tabIndex={0}>
                      <div style={{ borderRadius: "14px 14px 0 0", overflow: "hidden", flexShrink: 0 }}>
                        {producto.imagen_url ? (
                          <img className="producto-img" src={producto.imagen_url} alt={producto.nombre_producto} onError={(e) => { e.target.parentElement.innerHTML = '<div class="producto-img-placeholder">🍦</div>'; }} />
                        ) : (
                          <div className="producto-img-placeholder">🍦</div>
                        )}
                      </div>
                      <div className="producto-body">
                        <div className="producto-nombre">{producto.nombre_producto}</div>
                        <div className="producto-precio">
                          {monedaSeleccionada === "COP" ? formatCurrency(producto.precio_base, "COP") : monedaSeleccionada === "USD" ? formatCurrency(producto.precio_usd, "USD") : formatCurrency(producto.precio_usd * tasas["VES"], "VES")}
                        </div>
                        <button className="producto-add-btn" onClick={(e) => { e.stopPropagation(); agregarAlCarrito(producto); }}>
                          <i className="bi bi-plus-lg"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ventasRecientes.length > 0 && (
                <div className="recientes-section">
                  <div className="recientes-header">
                    <i className="bi bi-clock-history" style={{ color: "#7B2FBE", fontSize: "1rem" }}></i>
                    <span className="recientes-title">Ventas Recientes</span>
                  </div>
                  <div className="recientes-list">
                    {ventasRecientes.map((venta) => (
                      <div key={venta.id_venta} className="reciente-item">
                        <span className="reciente-factura">{venta.numero_factura}</span>
                        <div className="reciente-info">
                          <div className="reciente-cliente">{venta.nombre_cliente || "Cliente General"}</div>
                          <div className="reciente-fecha">{formatDateTime(venta.fecha_venta)}</div>
                        </div>
                        <div className="reciente-total">{formatCurrency(venta.total, venta.codigo_moneda)}</div>
                        <div className="estado-dot" style={{ background: COLORES_ESTADO[venta.estado_venta] || "#9580b0" }}></div>
                        <button className="ver-btn-sm" onClick={() => { setVentaSeleccionada(venta.id_venta); setShowDetalleModal(true); }}>
                          <i className="bi bi-eye me-1"></i>Ver
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Carrito — desktop */}
          <div className="carrito-panel">
            <CarritoContent
              carrito={carrito}
              nombreCliente={nombreCliente}
              setNombreCliente={setNombreCliente}
              clienteSeleccionado={clienteSeleccionado}
              setClienteSeleccionado={setClienteSeleccionado}
              clientesEncontrados={clientesEncontrados}
              mostrarSugerencias={mostrarSugerencias}
              setMostrarSugerencias={setMostrarSugerencias}
              buscandoCliente={buscandoCliente}
              seleccionarCliente={seleccionarCliente}
              limpiarCliente={limpiarCliente}
              monedaSeleccionada={monedaSeleccionada}
              calcularSubtotal={calcularSubtotal}
              removerDelCarrito={removerDelCarrito}
              actualizarCantidad={actualizarCantidad}
              removerTopping={removerTopping}
              removerSabor={removerSabor}
              removerSirope={removerSirope}
              totalMoneda={totalMoneda}
              montoRecibido={montoRecibido}
              setMontoRecibido={setMontoRecibido}
              mostrarVuelto={mostrarVuelto}
              setMostrarVuelto={setMostrarVuelto}
              procesarVenta={procesarVenta}
              procesando={procesando}
              getPrecioItem={getPrecioItem}
              formatCurrency={formatCurrency}
              extrasModal={extrasModal}
              setExtrasModal={setExtrasModal}
            />
          </div>
        </div>
      </div>

      {/* FAB móvil */}
      <button className="carrito-fab" onClick={() => setCarritoAbierto(true)} style={{ display: "none" }}>
        <i className="bi bi-cart3"></i>
        {totalItems > 0 && <span className="carrito-fab-badge">{totalItems}</span>}
      </button>

      {/* Overlay + Drawer móvil */}
      {carritoAbierto && (
        <div className="carrito-overlay" onClick={() => setCarritoAbierto(false)} style={{ display: "block" }}>
          <div className="carrito-drawer open" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-handle"></div>
            <CarritoContent
              carrito={carrito}
              nombreCliente={nombreCliente}
              setNombreCliente={setNombreCliente}
              clienteSeleccionado={clienteSeleccionado}
              setClienteSeleccionado={setClienteSeleccionado}
              clientesEncontrados={clientesEncontrados}
              mostrarSugerencias={mostrarSugerencias}
              setMostrarSugerencias={setMostrarSugerencias}
              buscandoCliente={buscandoCliente}
              seleccionarCliente={seleccionarCliente}
              limpiarCliente={limpiarCliente}
              monedaSeleccionada={monedaSeleccionada}
              calcularSubtotal={calcularSubtotal}
              removerDelCarrito={removerDelCarrito}
              actualizarCantidad={actualizarCantidad}
              removerTopping={removerTopping}
              removerSabor={removerSabor}
              removerSirope={removerSirope}
              totalMoneda={totalMoneda}
              montoRecibido={montoRecibido}
              setMontoRecibido={setMontoRecibido}
              mostrarVuelto={mostrarVuelto}
              setMostrarVuelto={setMostrarVuelto}
              procesarVenta={procesarVenta}
              procesando={procesando}
              getPrecioItem={getPrecioItem}
              formatCurrency={formatCurrency}
              extrasModal={extrasModal}
              setExtrasModal={setExtrasModal}
              onClose={() => setCarritoAbierto(false)}
              isMobile
            />
          </div>
        </div>
      )}

      <DetalleVentaModal
        show={showDetalleModal}
        onHide={() => setShowDetalleModal(false)}
        ventaId={ventaSeleccionada}
        onStatusChange={() => { loadData(); setShowDetalleModal(false); }}
      />
    </>
  );
};

/* ===== Sub-componente CarritoContent ===== */
const CarritoContent = ({
  carrito, nombreCliente, setNombreCliente, clienteSeleccionado, setClienteSeleccionado,
  clientesEncontrados, mostrarSugerencias, setMostrarSugerencias, buscandoCliente,
  seleccionarCliente, limpiarCliente, monedaSeleccionada,
  calcularSubtotal, removerDelCarrito, actualizarCantidad,
  removerTopping, removerSabor, removerSirope,
  totalMoneda, montoRecibido, setMontoRecibido, mostrarVuelto, setMostrarVuelto,
  procesarVenta, procesando, getPrecioItem, formatCurrency,
  extrasModal, setExtrasModal,
  onClose, isMobile
}) => {
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  const vuelto = Math.max(0, parseFloat(montoRecibido || 0) - totalMoneda);

  const abrirExtras = (item) => {
    // Determinar el primer tab que tenga opciones disponibles
    setExtrasModal({ itemId: item.id, tab: 'sabores' });
  };

  return (
    <>
      <div className="carrito-header">
        <div className="carrito-title">
          <i className="bi bi-cart3"></i>
          Pedido
          <span className="carrito-badge">{totalItems}</span>
        </div>
        {isMobile && onClose && (
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 9, width: 32, height: 32, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-x" style={{ fontSize: "1.1rem" }}></i>
          </button>
        )}
      </div>

      {/* Sección cliente */}
      <div className="cliente-section">
        <div className="cliente-label"><i className="bi bi-person me-1"></i>Cliente (opcional)</div>
        <div className="cliente-input-wrap">
          <i className="bi bi-search" style={{ color: "#c4b0d8", fontSize: "0.85rem", flexShrink: 0 }}></i>
          <input
            className="cliente-input"
            type="text"
            placeholder="Nombre del cliente..."
            value={nombreCliente}
            onChange={(e) => { setNombreCliente(e.target.value); if (clienteSeleccionado) setClienteSeleccionado(null); }}
            onFocus={() => { if (clientesEncontrados.length > 0) setMostrarSugerencias(true); }}
          />
          {(nombreCliente || clienteSeleccionado) && (
            <button className="cliente-clear-btn" onClick={limpiarCliente}>
              <i className="bi bi-x"></i>
            </button>
          )}
          {buscandoCliente && <div className="spinner-sm" style={{ borderColor: "rgba(123,47,190,0.2)", borderTopColor: "#7B2FBE", flexShrink: 0 }}></div>}
        </div>
        {clienteSeleccionado && (
          <div className="cliente-selected-badge">
            <i className="bi bi-check-circle-fill"></i>
            Cliente registrado
          </div>
        )}
        {mostrarSugerencias && clientesEncontrados.length > 0 && (
          <div className="sugerencias-list">
            {clientesEncontrados.map((c) => (
              <div key={c.id_cliente} className="sugerencia-item" onClick={() => seleccionarCliente(c)}>
                <div className="sugerencia-nombre">{c.nombre_cliente}</div>
                {c.telefono && <div className="sugerencia-tel">{c.telefono}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="carrito-items">
        {carrito.length === 0 ? (
          <div className="carrito-empty">
            <div className="carrito-empty-icon">🍦</div>
            <div className="carrito-empty-text">Toca un producto para agregar</div>
          </div>
        ) : (
          carrito.map((item) => {
            const hasExtras = item.sabores.length > 0 || item.toppings.length > 0 || item.siropes.length > 0;
            return (
              <div key={item.id} className={`carrito-item ${hasExtras ? 'has-extras' : ''}`}>

                {/* Fila superior: nombre + cantidad + eliminar */}
                <div className="carrito-item-top">
                  <div className="carrito-item-info">
                    <div className="carrito-item-nombre">{item.nombre}</div>
                    <div className="carrito-item-precio-unit">
                      {formatCurrency(getPrecioItem(item, "precio_cop", "precio_usd"), monedaSeleccionada)} c/u
                    </div>
                  </div>
                  <div className="qty-row">
                    <button className="qty-btn" onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>−</button>
                    <span className="qty-num">{item.cantidad}</span>
                    <button className="qty-btn" onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>+</button>
                    <button className="item-delete-btn" onClick={() => removerDelCarrito(item.id)}>
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>

                {/* Tags de extras seleccionados (tap para quitar) */}
                {hasExtras && (
                  <div className="extras-tags">
                    {item.sabores.map((s) => (
                      <span key={s.id_sabor} className="extra-tag sabor" onClick={() => removerSabor(item.id, s.id_sabor)}>
                        🍓 {s.nombre} <span className="extra-tag-x">×</span>
                      </span>
                    ))}
                    {item.toppings.map((t) => (
                      <span key={t.id_topping} className="extra-tag topping" onClick={() => removerTopping(item.id, t.id_topping)}>
                        🍫 {t.nombre} <span className="extra-tag-x">×</span>
                      </span>
                    ))}
                    {item.siropes.map((s) => (
                      <span key={s.id_sirope} className="extra-tag sirope" onClick={() => removerSirope(item.id, s.id_sirope)}>
                        🍯 {s.nombre} <span className="extra-tag-x">×</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Fila inferior: botón extras + subtotal */}
                <div className="item-subtotal-row">
                  <button
                    className={`extras-trigger-btn ${hasExtras ? 'has-extras' : ''}`}
                    onClick={() => abrirExtras(item)}
                  >
                    <i className={`bi ${hasExtras ? 'bi-pencil-square' : 'bi-plus-circle-dotted'}`}></i>
                    {hasExtras
                      ? `${item.sabores.length + item.toppings.length + item.siropes.length} extra${item.sabores.length + item.toppings.length + item.siropes.length > 1 ? 's' : ''}`
                      : 'Agregar extras'}
                  </button>
                  <span className="item-subtotal">{formatCurrency(calcularSubtotal(item), monedaSeleccionada)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {carrito.length > 0 && (
        <div className="carrito-footer">
          <div className="total-row">
            <span className="total-label">Total {monedaSeleccionada}</span>
            <span className="total-amount">{formatCurrency(totalMoneda, monedaSeleccionada)}</span>
          </div>

          <div className="monto-section">
            <div className="monto-label">
              <i className="bi bi-cash-coin"></i>
              Monto recibido ({monedaSeleccionada})
            </div>
            <input
              className="monto-input"
              type="number"
              step="0.01"
              min="0"
              placeholder={`Ej: ${formatCurrency(Math.ceil(totalMoneda / 1000) * 1000, monedaSeleccionada)}`}
              value={montoRecibido}
              onChange={(e) => { setMontoRecibido(e.target.value); setMostrarVuelto(parseFloat(e.target.value) >= totalMoneda); }}
            />
            {montoRecibido && parseFloat(montoRecibido) < totalMoneda && (
              <div className="insuficiente-msg">
                <i className="bi bi-exclamation-circle-fill"></i>
                Faltan {formatCurrency(totalMoneda - parseFloat(montoRecibido), monedaSeleccionada)}
              </div>
            )}
            {mostrarVuelto && parseFloat(montoRecibido) > 0 && (
              <div className="vuelto-box">
                <span className="vuelto-label"><i className="bi bi-arrow-return-left me-1"></i>Vuelto</span>
                <span className="vuelto-amount">{formatCurrency(vuelto, monedaSeleccionada)}</span>
              </div>
            )}
          </div>

          <button className="procesar-btn" onClick={procesarVenta} disabled={procesando}>
            {procesando ? (
              <><div className="spinner-sm"></div> Procesando...</>
            ) : (
              <><i className="bi bi-send-fill"></i> Procesar Venta</>
            )}
          </button>
        </div>
      )}
    </>
  );
};

export default NuevaVentaScreen;