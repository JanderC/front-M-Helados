import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Modal, Spinner } from 'react-bootstrap';
import { metodosPagoService } from '../../api/services/metodosPagoService';
import { monedasService } from '../../api/services/monedasService';
import { toast } from 'react-toastify';

const ICONOS_SUGERIDOS = [
  'bi-cash-stack', 'bi-cash', 'bi-phone', 'bi-bank', 'bi-credit-card', 'bi-wallet2', 'bi-qr-code',
];

const formVacio = { id_moneda: '', nombre: '', icono: 'bi-cash', orden: 0 };

const MetodosPagoScreen = () => {
  const [metodos, setMetodos] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null); // método completo si estamos editando, null si es nuevo
  const [form, setForm] = useState(formVacio);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metResponse, monResponse] = await Promise.all([
        metodosPagoService.getAll(), // sin filtro: trae activos e inactivos
        monedasService.getTasas(),
      ]);
      setMetodos(metResponse.data?.data || metResponse.data || []);
      const monedasData = monResponse.data?.data || monResponse.data || [];
      setMonedas(Array.isArray(monedasData) ? monedasData : []);
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formVacio);
    setShowModal(true);
  };

  const abrirEditar = (metodo) => {
    setEditando(metodo);
    setForm({
      id_moneda: metodo.id_moneda || '',
      nombre: metodo.nombre,
      icono: metodo.icono || 'bi-cash',
      orden: metodo.orden || 0,
    });
    setShowModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      toast.warning('El nombre es requerido');
      return;
    }

    try {
      setGuardando(true);
      const payload = {
        nombre: form.nombre.trim(),
        id_moneda: form.id_moneda || null,
        icono: form.icono || 'bi-cash',
        orden: parseInt(form.orden, 10) || 0,
      };

      if (editando) {
        await metodosPagoService.update(editando.id_metodo_pago, payload);
        toast.success('Método de pago actualizado');
      } else {
        await metodosPagoService.create({ ...payload, codigo: form.nombre });
        toast.success('Método de pago creado');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error al guardar método de pago:', error);
      toast.error(error.response?.data?.message || 'Error al guardar método de pago');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggle = async (metodo) => {
    try {
      await metodosPagoService.toggle(metodo.id_metodo_pago);
      toast.success(metodo.activo ? 'Método desactivado' : 'Método activado');
      loadData();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado del método de pago');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-wallet2 me-2 text-primary"></i>
          Métodos de Pago
        </h2>
        <Button variant="primary" onClick={abrirNuevo}>
          <i className="bi bi-plus-circle me-2"></i>
          Nuevo Método
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : metodos.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-wallet2" style={{ fontSize: '4rem', color: '#ccc' }}></i>
              <h5 className="mt-3 text-muted">No hay métodos de pago registrados</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead className="table-light">
                  <tr>
                    <th></th>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Moneda</th>
                    <th>Orden</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {metodos.map((metodo) => (
                    <tr key={metodo.id_metodo_pago} className={!metodo.activo ? 'text-muted' : ''}>
                      <td>
                        <i className={`bi ${metodo.icono || 'bi-cash'}`} style={{ fontSize: '1.2rem' }}></i>
                      </td>
                      <td className="fw-bold">{metodo.nombre}</td>
                      <td><code>{metodo.codigo}</code></td>
                      <td>
                        {metodo.codigo_moneda
                          ? <Badge bg="secondary">{metodo.codigo_moneda}</Badge>
                          : <Badge bg="light" text="dark">Todas</Badge>}
                      </td>
                      <td>{metodo.orden}</td>
                      <td>
                        <Badge bg={metodo.activo ? 'success' : 'secondary'}>
                          {metodo.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => abrirEditar(metodo)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant={metodo.activo ? 'outline-secondary' : 'outline-success'}
                          size="sm"
                          onClick={() => handleToggle(metodo)}
                        >
                          <i className={`bi ${metodo.activo ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal crear/editar */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${editando ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
            {editando ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGuardar}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Nequi, Bancolombia, Pago Móvil..."
                disabled={guardando}
                required
              />
              {!editando && (
                <Form.Text className="text-muted">
                  El código interno se genera automáticamente a partir del nombre
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Moneda</Form.Label>
              <Form.Select
                value={form.id_moneda}
                onChange={(e) => setForm({ ...form, id_moneda: e.target.value })}
                disabled={guardando}
              >
                <option value="">Todas las monedas</option>
                {monedas.map((m) => (
                  <option key={m.id_moneda} value={m.id_moneda}>{m.codigo_moneda}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Si eliges una moneda, este método solo aparecerá al vender en esa moneda (ej: Nequi solo en COP)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ícono</Form.Label>
              <Form.Select
                value={form.icono}
                onChange={(e) => setForm({ ...form, icono: e.target.value })}
                disabled={guardando}
              >
                {ICONOS_SUGERIDOS.map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </Form.Select>
              <div className="mt-2">
                <i className={`bi ${form.icono}`} style={{ fontSize: '1.5rem' }}></i>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Orden</Form.Label>
              <Form.Control
                type="number"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: e.target.value })}
                disabled={guardando}
              />
              <Form.Text className="text-muted">
                Define el orden en que aparece en el selector de pago (menor primero)
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Crear Método'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MetodosPagoScreen;