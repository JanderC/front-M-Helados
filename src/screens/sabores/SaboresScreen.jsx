import { useState, useEffect } from "react";
import { Modal, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { saboresService } from "../../api/services/saboresService";
import { monedasService } from "../../api/services/monedasService";
import { formatCurrency } from "../../utils/formatters";

const SABOR_VACIO = {
  id_sabor: null,
  nombre_sabor: "",
  descripcion: "",
  tiene_costo: false,
  precio_adicional_cop: "",
  precio_adicional_usd: "",
};

const SaboresScreen = () => {
  const [sabores, setSabores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(SABOR_VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [tasaCOP, setTasaCOP] = useState(null); // COP por 1 USD, para derivar precios

  useEffect(() => {
    cargarSabores();
    cargarTasa();
  }, []);

  const cargarTasa = async () => {
    try {
      const resp = await monedasService.getTasas();
      const monedas = resp.data?.data || resp.data || [];
      const cop = Array.isArray(monedas) ? monedas.find((m) => m.codigo_moneda === "COP") : null;
      if (cop) setTasaCOP(parseFloat(cop.tasa_cambio_usd));
    } catch (error) {
      console.error("Error al cargar tasas:", error);
    }
  };

  const cargarSabores = async () => {
    try {
      setCargando(true);
      const resp = await saboresService.getAll();
      setSabores(resp.data?.data || resp.data || []);
    } catch (error) {
      console.error("Error al cargar sabores:", error);
      toast.error("No se pudieron cargar los sabores");
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevo = () => {
    setForm(SABOR_VACIO);
    setModalAbierto(true);
  };

  const abrirEditar = (sabor) => {
    const tieneCosto =
      parseFloat(sabor.precio_adicional_cop || 0) > 0 ||
      parseFloat(sabor.precio_adicional_usd || 0) > 0;
    setForm({
      id_sabor: sabor.id_sabor,
      nombre_sabor: sabor.nombre_sabor || "",
      descripcion: sabor.descripcion || "",
      tiene_costo: tieneCosto,
      precio_adicional_cop: tieneCosto ? sabor.precio_adicional_cop ?? "" : "",
      precio_adicional_usd: tieneCosto ? sabor.precio_adicional_usd ?? "" : "",
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const guardarSabor = async () => {
    if (!form.nombre_sabor.trim()) {
      toast.warning("El nombre del sabor es requerido");
      return;
    }

    const precioCOP = form.tiene_costo ? parseFloat(form.precio_adicional_cop || 0) : 0;
    let precioUSD = form.tiene_costo ? parseFloat(form.precio_adicional_usd || 0) : 0;

    // 🔥 Si tiene costo y no cargaron el equivalente en USD, se deriva con la
    // tasa vigente. Sin esto, el precio no se sumaba al pasar la venta a
    // bolívares (esa conversión siempre se calcula a partir del USD).
    if (form.tiene_costo && precioUSD === 0 && precioCOP > 0 && tasaCOP) {
      precioUSD = precioCOP / tasaCOP;
    }

    const payload = {
      nombre_sabor: form.nombre_sabor.trim(),
      descripcion: form.descripcion.trim() || null,
      // Si el sabor no tiene costo adicional, se guarda en 0 (se muestra "Gratis")
      precio_adicional_cop: precioCOP,
      precio_adicional_usd: precioUSD,
    };

    try {
      setGuardando(true);
      if (form.id_sabor) {
        await saboresService.update(form.id_sabor, payload);
        toast.success("Sabor actualizado correctamente");
      } else {
        await saboresService.create(payload);
        toast.success("Sabor creado correctamente");
      }
      setModalAbierto(false);
      cargarSabores();
    } catch (error) {
      console.error("Error al guardar sabor:", error);
      toast.error(error.response?.data?.message || "Error al guardar el sabor");
    } finally {
      setGuardando(false);
    }
  };

  const toggleDisponible = async (sabor) => {
    try {
      await saboresService.update(sabor.id_sabor, { disponible: !sabor.disponible });
      setSabores((prev) =>
        prev.map((s) =>
          s.id_sabor === sabor.id_sabor ? { ...s, disponible: !s.disponible } : s
        )
      );
    } catch (error) {
      console.error("Error al cambiar disponibilidad:", error);
      toast.error("No se pudo actualizar la disponibilidad");
    }
  };

  const eliminarSabor = async (sabor) => {
    if (!window.confirm(`¿Eliminar el sabor "${sabor.nombre_sabor}"?`)) return;
    try {
      await saboresService.delete(sabor.id_sabor);
      toast.success("Sabor eliminado");
      setSabores((prev) => prev.filter((s) => s.id_sabor !== sabor.id_sabor));
    } catch (error) {
      console.error("Error al eliminar sabor:", error);
      toast.error(error.response?.data?.message || "No se pudo eliminar el sabor");
    }
  };

  const saboresFiltrados = sabores.filter((s) =>
    s.nombre_sabor?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="sabores-screen">
      <style>{`
        .sabores-screen { font-family: 'DM Sans', sans-serif; }
        .sabores-header {
          background: linear-gradient(135deg, #5E1F96 0%, #7B2FBE 100%);
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(94,31,150,0.18);
        }
        .sabores-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          color: #fff;
          font-size: 1.4rem;
          margin: 0;
        }
        .sabores-subtitle {
          color: rgba(255,255,255,0.75);
          font-size: 0.85rem;
          margin: 2px 0 0;
        }
        .btn-nuevo-sabor {
          background: linear-gradient(135deg, #7DE8D8, #4DCFBD);
          color: #1a0a2e;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s ease;
        }
        .btn-nuevo-sabor:hover { transform: translateY(-1px); }

        .sabores-toolbar { margin-bottom: 16px; }
        .sabores-search {
          border: 1px solid rgba(123,47,190,0.2);
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 0.9rem;
          width: 100%;
          max-width: 320px;
        }
        .sabores-search:focus { outline: none; border-color: #7B2FBE; }

        .sabores-table-wrap {
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(123,47,190,0.1);
          overflow: hidden;
        }
        table.sabores-table { width: 100%; border-collapse: collapse; }
        .sabores-table th {
          background: #f5f0fb;
          color: #5E1F96;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
          padding: 12px 16px;
          text-align: left;
        }
        .sabores-table td {
          padding: 12px 16px;
          border-top: 1px solid rgba(123,47,190,0.08);
          font-size: 0.9rem;
          color: #3a2a52;
          vertical-align: middle;
        }
        .sabores-table tr:hover td { background: rgba(123,47,190,0.03); }

        .precio-pill {
          font-weight: 700;
          font-size: 0.8rem;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(123,47,190,0.08);
          color: #5E1F96;
        }
        .precio-pill.gratis { background: rgba(16,185,129,0.1); color: #10b981; }

        .disp-switch {
          border: none;
          background: none;
          font-size: 1.6rem;
          line-height: 1;
          cursor: pointer;
          color: #c9bcdc;
        }
        .disp-switch.on { color: #4DCFBD; }

        .action-btn {
          border: none;
          background: none;
          font-size: 1.05rem;
          padding: 4px 8px;
          border-radius: 8px;
          color: #7B2FBE;
        }
        .action-btn:hover { background: rgba(123,47,190,0.08); }
        .action-btn.danger { color: #ef4444; }
        .action-btn.danger:hover { background: rgba(239,68,68,0.08); }

        .form-label-sm {
          font-size: 0.78rem;
          font-weight: 700;
          color: #5a4a72;
          margin-bottom: 4px;
          display: block;
        }
        .form-control-sm2 {
          width: 100%;
          border: 1px solid rgba(123,47,190,0.2);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.9rem;
          margin-bottom: 14px;
        }
        .form-control-sm2:focus { outline: none; border-color: #7B2FBE; }
      `}</style>

      <div className="sabores-header">
        <div>
          <p className="sabores-title">🍓 Sabores</p>
          <p className="sabores-subtitle">
            Gestiona los sabores disponibles para la venta. Cada uno puede ser
            gratis o tener un costo adicional.
          </p>
        </div>
        <button className="btn-nuevo-sabor" onClick={abrirNuevo}>
          <i className="bi bi-plus-lg" /> Nuevo sabor
        </button>
      </div>

      <div className="sabores-toolbar">
        <input
          className="sabores-search"
          placeholder="Buscar sabor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="sabores-table-wrap">
        {cargando ? (
          <div className="p-4 text-center text-muted">Cargando sabores...</div>
        ) : saboresFiltrados.length === 0 ? (
          <div className="p-4 text-center text-muted">No hay sabores registrados</div>
        ) : (
          <table className="sabores-table">
            <thead>
              <tr>
                <th>Sabor</th>
                <th>Descripción</th>
                <th>Precio COP</th>
                <th>Precio USD</th>
                <th>Disponible</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {saboresFiltrados.map((sabor) => {
                const precioCOP = parseFloat(sabor.precio_adicional_cop || 0);
                const precioUSD = parseFloat(sabor.precio_adicional_usd || 0);
                const tieneCosto = precioCOP > 0 || precioUSD > 0;
                return (
                  <tr key={sabor.id_sabor}>
                    <td style={{ fontWeight: 600 }}>{sabor.nombre_sabor}</td>
                    <td className="text-muted">{sabor.descripcion || "—"}</td>
                    <td>
                      <span className={`precio-pill ${tieneCosto ? "" : "gratis"}`}>
                        {tieneCosto ? formatCurrency(precioCOP, "COP") : "Gratis"}
                      </span>
                    </td>
                    <td>
                      {tieneCosto ? (
                        <span className="precio-pill">{formatCurrency(precioUSD, "USD")}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`disp-switch ${sabor.disponible ? "on" : ""}`}
                        onClick={() => toggleDisponible(sabor)}
                        title={sabor.disponible ? "Disponible" : "No disponible"}
                      >
                        <i className={`bi ${sabor.disponible ? "bi-toggle-on" : "bi-toggle-off"}`} />
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="action-btn" onClick={() => abrirEditar(sabor)} title="Editar">
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => eliminarSabor(sabor)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal show={modalAbierto} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem" }}>
            {form.id_sabor ? "Editar sabor" : "Nuevo sabor"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className="form-label-sm">Nombre del sabor *</label>
          <input
            className="form-control-sm2"
            value={form.nombre_sabor}
            onChange={(e) => setForm({ ...form, nombre_sabor: e.target.value })}
            placeholder="Ej: Chocolate, Fresa, Ron con pasas..."
          />

          <label className="form-label-sm">Descripción (opcional)</label>
          <input
            className="form-control-sm2"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalle breve del sabor"
          />

          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="tiene-costo"
              checked={form.tiene_costo}
              onChange={(e) => setForm({ ...form, tiene_costo: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="tiene-costo" style={{ fontSize: "0.88rem" }}>
              Este sabor tiene un costo adicional
            </label>
          </div>

          {form.tiene_costo && (
            <div className="row">
              <div className="col-6">
                <label className="form-label-sm">Precio adicional (COP)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control-sm2"
                  value={form.precio_adicional_cop}
                  onChange={(e) => setForm({ ...form, precio_adicional_cop: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="col-6">
                <label className="form-label-sm">Precio adicional (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control-sm2"
                  value={form.precio_adicional_usd}
                  onChange={(e) => setForm({ ...form, precio_adicional_usd: e.target.value })}
                  placeholder={
                    tasaCOP && form.precio_adicional_cop
                      ? `Auto: ${(parseFloat(form.precio_adicional_cop || 0) / tasaCOP).toFixed(2)}`
                      : "0.00"
                  }
                />
              </div>
            </div>
          )}

          {!form.tiene_costo && (
            <Badge bg="light" text="dark" style={{ fontWeight: 500 }}>
              Este sabor se mostrará como "Gratis" al armar la venta
            </Badge>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-outline-secondary" onClick={cerrarModal} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn-nuevo-sabor" onClick={guardarSabor} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SaboresScreen;