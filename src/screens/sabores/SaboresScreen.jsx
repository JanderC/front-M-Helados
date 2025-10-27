import { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Form, Row, Col, Modal } from 'react-bootstrap';
import { saboresService } from '../../api/services/saboresService';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import { useMoneda } from '../../context/MonedaContext';

const SaboresScreen = () => {
  const [sabores, setSabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saborActual, setSaborActual] = useState(null);
  const [formData, setFormData] = useState({
    nombre_sabor: '',
    descripcion: '',
    precio_adicional_cop: '0.00',
    precio_adicional_usd: '0.00'
  });
  const [errors, setErrors] = useState({});
  const [filtroDisponible, setFiltroDisponible] = useState('');
  const { convertirPrecio } = useMoneda();

  useEffect(() => {
    loadSabores();
  }, [filtroDisponible]);

  const loadSabores = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroDisponible !== '') {
        params.disponible = filtroDisponible;
      }
      const response = await saboresService.getAll(params);
      setSabores(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error al cargar sabores:', error);
      toast.error('Error al cargar sabores');
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (sabor = null) => {
    if (sabor) {
      setSaborActual(sabor);
      setFormData({
        nombre_sabor: sabor.nombre_sabor,
        descripcion: sabor.descripcion || '',
        precio_adicional_cop: sabor.precio_adicional_cop || '0.00',
        precio_adicional_usd: sabor.precio_adicional_usd || '0.00'
      });
    } else {
      setSaborActual(null);
      setFormData({
        nombre_sabor: '',
        descripcion: '',
        precio_adicional_cop: '0.00',
        precio_adicional_usd: '0.00'
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSaborActual(null);
    setFormData({
      nombre_sabor: '',
      descripcion: '',
      precio_adicional_cop: '0.00',
      precio_adicional_usd: '0.00'
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.nombre_sabor.trim()) {
      newErrors.nombre_sabor = 'El nombre es requerido';
    }

    if (!formData.precio_adicional_cop || parseFloat(formData.precio_adicional_cop) < 0) {
      newErrors.precio_adicional_cop = 'El precio en COP no puede ser negativo';
    }

    if (!formData.precio_adicional_usd || parseFloat(formData.precio_adicional_usd) < 0) {
      newErrors.precio_adicional_usd = 'El precio en USD no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const data = {
        nombre_sabor: formData.nombre_sabor.trim(),
        descripcion: formData.descripcion.trim() || null,
        precio_adicional_cop: parseFloat(formData.precio_adicional_cop),
        precio_adicional_usd: parseFloat(formData.precio_adicional_usd)
      };

      if (saborActual) {
        await saboresService.update(saborActual.id_sabor, data);
        toast.success('Sabor actualizado correctamente');
      } else {
        await saboresService.create(data);
        toast.success('Sabor creado correctamente');
      }

      handleCloseModal();
      loadSabores();
    } catch (error) {
      console.error('Error al guardar sabor:', error);
      toast.error(error.response?.data?.message || 'Error al guardar sabor');
    }
  };

  const handleToggleDisponible = async (sabor) => {
    try {
      await saboresService.update(sabor.id_sabor, {
        disponible: !sabor.disponible
      });
      toast.success('Estado actualizado correctamente');
      loadSabores();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este sabor?')) {
      return;
    }

    try {
      await saboresService.delete(id);
      toast.success('Sabor eliminado correctamente');
      loadSabores();
    } catch (error) {
      console.error('Error al eliminar sabor:', error);
      toast.error('Error al eliminar sabor');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-ice-cream me-2 text-primary"></i>
          Gestión de Sabores
        </h2>
        <Button variant="primary" onClick={() => handleShowModal()}>
          <i className="bi bi-plus-circle me-2"></i>
          Nuevo Sabor
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Select
                value={filtroDisponible}
                onChange={(e) => setFiltroDisponible(e.target.value)}
              >
                <option value="">Todos los sabores</option>
                <option value="true">Solo disponibles</option>
                <option value="false">Solo no disponibles</option>
              </Form.Select>
            </Col>
            <Col md={8} className="text-end">
              <Badge bg="secondary">{sabores.length} sabores encontrados</Badge>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Precio Adicional</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2" />
                      Cargando sabores...
                    </td>
                  </tr>
                ) : sabores.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                      No hay sabores registrados
                    </td>
                  </tr>
                ) : (
                  sabores.map((sabor) => {
                    const precioConvertido = convertirPrecio(
                      sabor.precio_adicional_cop,
                      sabor.precio_adicional_usd
                    );

                    return (
                      <tr key={sabor.id_sabor}>
                        <td>
                          <strong>{sabor.nombre_sabor}</strong>
                        </td>
                        <td>
                          <small className="text-muted">
                            {sabor.descripcion || 'Sin descripción'}
                          </small>
                        </td>
                        <td>
                          <Badge bg="secondary">
                            {formatCurrency(precioConvertido.monto, precioConvertido.moneda)}
                          </Badge>
                        </td>
                        <td>
                          <Form.Check
                            type="switch"
                            checked={sabor.disponible}
                            onChange={() => handleToggleDisponible(sabor)}
                            label={sabor.disponible ? 'Disponible' : 'No disponible'}
                          />
                        </td>
                        <td className="text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(sabor)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(sabor.id_sabor)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Modal de Formulario */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-ice-cream me-2"></i>
            {saborActual ? 'Editar Sabor' : 'Nuevo Sabor'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del Sabor *</Form.Label>
              <Form.Control
                type="text"
                name="nombre_sabor"
                value={formData.nombre_sabor}
                onChange={handleChange}
                placeholder="Ej: Vainilla Francesa"
                isInvalid={!!errors.nombre_sabor}
              />
              <Form.Control.Feedback type="invalid">
                {errors.nombre_sabor}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Descripción del sabor..."
              />
            </Form.Group>

            {/* Precios */}
            <div className="border rounded p-3 mb-3 bg-light">
              <h6 className="mb-3">
                <i className="bi bi-cash-stack me-2"></i>
                Precios Adicionales
              </h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Precio en Pesos (COP) *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="precio_adicional_cop"
                      value={formData.precio_adicional_cop}
                      onChange={handleChange}
                      placeholder="0.00"
                      isInvalid={!!errors.precio_adicional_cop}
                    />
                    <Form.Text className="text-muted">
                      Costo extra en pesos colombianos (0 si no aplica)
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">
                      {errors.precio_adicional_cop}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Precio Referencia (USD) *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="precio_adicional_usd"
                      value={formData.precio_adicional_usd}
                      onChange={handleChange}
                      placeholder="0.00"
                      isInvalid={!!errors.precio_adicional_usd}
                    />
                    <Form.Text className="text-muted">
                      Usado para conversión a bolívares
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">
                      {errors.precio_adicional_usd}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {saborActual ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default SaboresScreen;