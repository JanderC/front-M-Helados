import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { siropesService } from '../../api/services/siropesService';
import { toast } from 'react-toastify';

const SiropeFormModal = ({ show, onHide, sirope, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    nombre_sirope: '',
    descripcion: '',
    precio_adicional_cop: '',
    precio_adicional_usd: '',
    costo_unitario_cop: '',
    costo_unitario_usd: '',
    stock_actual: '',
    stock_minimo: '',
    unidad_medida: 'ml'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (sirope) {
      setFormData({
        nombre_sirope: sirope.nombre_sirope || '',
        descripcion: sirope.descripcion || '',
        precio_adicional_cop: sirope.precio_adicional_cop || '',
        precio_adicional_usd: sirope.precio_adicional_usd || '',
        costo_unitario_cop: sirope.costo_unitario_cop || '',
        costo_unitario_usd: sirope.costo_unitario_usd || '',
        stock_actual: sirope.stock_actual || '',
        stock_minimo: sirope.stock_minimo || '',
        unidad_medida: sirope.unidad_medida || 'ml'
      });
    } else {
      resetForm();
    }
  }, [sirope]);

  const resetForm = () => {
    setFormData({
      nombre_sirope: '',
      descripcion: '',
      precio_adicional_cop: '',
      precio_adicional_usd: '',
      costo_unitario_cop: '',
      costo_unitario_usd: '',
      stock_actual: '',
      stock_minimo: '',
      unidad_medida: 'ml'
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.nombre_sirope.trim()) {
      newErrors.nombre_sirope = 'El nombre es requerido';
    }

    if (!formData.precio_adicional_cop || formData.precio_adicional_cop < 0) {
      newErrors.precio_adicional_cop = 'El precio en COP no puede ser negativo';
    }

    if (!formData.precio_adicional_usd || formData.precio_adicional_usd < 0) {
      newErrors.precio_adicional_usd = 'El precio en USD no puede ser negativo';
    }

    if (formData.costo_unitario_cop && formData.costo_unitario_cop < 0) {
      newErrors.costo_unitario_cop = 'El costo en COP no puede ser negativo';
    }

    if (formData.costo_unitario_usd && formData.costo_unitario_usd < 0) {
      newErrors.costo_unitario_usd = 'El costo en USD no puede ser negativo';
    }

    if (!formData.stock_actual || formData.stock_actual < 0) {
      newErrors.stock_actual = 'El stock no puede ser negativo';
    }

    if (!formData.stock_minimo || formData.stock_minimo < 0) {
      newErrors.stock_minimo = 'El stock mínimo no puede ser negativo';
    }

    if (!formData.unidad_medida.trim()) {
      newErrors.unidad_medida = 'La unidad de medida es requerida';
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
      setLoading(true);

      const data = {
        nombre_sirope: formData.nombre_sirope.trim(),
        descripcion: formData.descripcion.trim(),
        precio_adicional_cop: parseFloat(formData.precio_adicional_cop),
        precio_adicional_usd: parseFloat(formData.precio_adicional_usd),
        costo_unitario_cop: formData.costo_unitario_cop ? parseFloat(formData.costo_unitario_cop) : null,
        costo_unitario_usd: formData.costo_unitario_usd ? parseFloat(formData.costo_unitario_usd) : null,
        stock_actual: parseFloat(formData.stock_actual),
        stock_minimo: parseFloat(formData.stock_minimo),
        unidad_medida: formData.unidad_medida.trim()
      };

      if (sirope) {
        await siropesService.update(sirope.id_sirope, data);
        toast.success('Sirope actualizado correctamente');
      } else {
        await siropesService.create(data);
        toast.success('Sirope creado correctamente');
      }

      onSaveSuccess();
    } catch (error) {
      console.error('Error al guardar sirope:', error);
      toast.error(error.response?.data?.message || 'Error al guardar sirope');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-droplet-half me-2"></i>
          {sirope ? 'Editar Sirope' : 'Nuevo Sirope'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control
                  type="text"
                  name="nombre_sirope"
                  value={formData.nombre_sirope}
                  onChange={handleChange}
                  isInvalid={!!errors.nombre_sirope}
                  disabled={loading}
                  placeholder="Ej: Chocolate, Caramelo, Fresa..."
                />
                <Form.Control.Feedback type="invalid">
                  {errors.nombre_sirope}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Unidad de Medida *</Form.Label>
                <Form.Select
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  isInvalid={!!errors.unidad_medida}
                  disabled={loading}
                >
                  <option value="ml">Mililitros (ml)</option>
                  <option value="litros">Litros</option>
                  <option value="onzas">Onzas</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.unidad_medida}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              disabled={loading}
              placeholder="Descripción del sirope..."
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
                    isInvalid={!!errors.precio_adicional_cop}
                    disabled={loading}
                    placeholder="2000.00"
                  />
                  <Form.Text className="text-muted">
                    Precio adicional en pesos colombianos
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
                    isInvalid={!!errors.precio_adicional_usd}
                    disabled={loading}
                    placeholder="0.50"
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

          {/* Costos */}
          <div className="border rounded p-3 mb-3 bg-light">
            <h6 className="mb-3">
              <i className="bi bi-calculator me-2"></i>
              Costos Unitarios (Opcional)
            </h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Costo en Pesos (COP)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="costo_unitario_cop"
                    value={formData.costo_unitario_cop}
                    onChange={handleChange}
                    isInvalid={!!errors.costo_unitario_cop}
                    disabled={loading}
                    placeholder="1000.00"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.costo_unitario_cop}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Costo Referencia (USD)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="costo_unitario_usd"
                    value={formData.costo_unitario_usd}
                    onChange={handleChange}
                    isInvalid={!!errors.costo_unitario_usd}
                    disabled={loading}
                    placeholder="0.25"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.costo_unitario_usd}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Stock */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Stock Actual *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="stock_actual"
                  value={formData.stock_actual}
                  onChange={handleChange}
                  isInvalid={!!errors.stock_actual}
                  disabled={loading}
                  placeholder="0"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.stock_actual}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Stock Mínimo *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="stock_minimo"
                  value={formData.stock_minimo}
                  onChange={handleChange}
                  isInvalid={!!errors.stock_minimo}
                  disabled={loading}
                  placeholder="10"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.stock_minimo}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : (sirope ? 'Actualizar' : 'Crear')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default SiropeFormModal;