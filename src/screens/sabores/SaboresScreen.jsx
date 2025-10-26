import { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Form, Row, Col, Modal } from 'react-bootstrap';
import { saboresService } from '../../api/services/saboresService';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';

const SaboresScreen = () => {
  const [sabores, setSabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saborActual, setSaborActual] = useState(null);
  const [formData, setFormData] = useState({
    nombre_sabor: '',
    descripcion: '',
    precio_adicional: '0.00'
  });
  const [filtroDisponible, setFiltroDisponible] = useState('');

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
        precio_adicional: sabor.precio_adicional || '0.00'
      });
    } else {
      setSaborActual(null);
      setFormData({
        nombre_sabor: '',
        descripcion: '',
        precio_adicional: '0.00'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSaborActual(null);
    setFormData({
      nombre_sabor: '',
      descripcion: '',
      precio_adicional: '0.00'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre_sabor.trim()) {
      toast.error('El nombre del sabor es requerido');
      return;
    }

    try {
      const data = {
        nombre_sabor: formData.nombre_sabor.trim(),
        descripcion: formData.descripcion.trim() || null,
        precio_adicional: parseFloat(formData.precio_adicional) || 0
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
                      Cargando sabores...
                    </td>
                  </tr>
                ) : sabores.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      No hay sabores registrados
                    </td>
                  </tr>
                ) : (
                  sabores.map((sabor) => (
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
                          {formatCurrency(parseFloat(sabor.precio_adicional || 0), 'USD')}
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
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(sabor.id_sabor)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Modal de Formulario */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
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
                required
              />
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

            <Form.Group className="mb-3">
              <Form.Label>Precio Adicional (USD)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                name="precio_adicional"
                value={formData.precio_adicional}
                onChange={handleChange}
                placeholder="0.00"
              />
              <Form.Text className="text-muted">
                Costo extra por seleccionar este sabor (0 si no aplica)
              </Form.Text>
            </Form.Group>
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