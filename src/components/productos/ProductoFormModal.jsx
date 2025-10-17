import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { productosService } from '../../api/services/productosService';
import { toast } from 'react-toastify';

const ProductoFormModal = ({ show, onHide, producto, onSaveSuccess, categorias }) => {
  const [formData, setFormData] = useState({
    nombre_producto: '',
    descripcion: '',
    id_categoria: '',
    precio_base: '',
    costo_produccion: '',
    imagen_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categoriasCompletas, setCategoriasCompletas] = useState([]);

  useEffect(() => {
    loadCategoriasCompletas();
  }, []);

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre_producto: producto.nombre_producto || '',
        descripcion: producto.descripcion || '',
        id_categoria: producto.id_categoria || '',
        precio_base: producto.precio_base || '',
        costo_produccion: producto.costo_produccion || '',
        imagen_url: producto.imagen_url || ''
      });
    } else {
      resetForm();
    }
  }, [producto]);

  const loadCategoriasCompletas = async () => {
    try {
      const response = await productosService.getCategorias();
      if (response.data.success) {
        setCategoriasCompletas(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre_producto: '',
      descripcion: '',
      id_categoria: '',
      precio_base: '',
      costo_produccion: '',
      imagen_url: ''
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Limpiar error del campo
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.nombre_producto.trim()) {
      newErrors.nombre_producto = 'El nombre es requerido';
    }

    if (!formData.id_categoria) {
      newErrors.id_categoria = 'La categoría es requerida';
    }

    if (!formData.precio_base || formData.precio_base <= 0) {
      newErrors.precio_base = 'El precio debe ser mayor a 0';
    }

    if (!formData.costo_produccion || formData.costo_produccion < 0) {
      newErrors.costo_produccion = 'El costo no puede ser negativo';
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
        nombre_producto: formData.nombre_producto.trim(),
        descripcion: formData.descripcion.trim(),
        id_categoria: parseInt(formData.id_categoria),
        precio_base: parseFloat(formData.precio_base),
        costo_produccion: parseFloat(formData.costo_produccion),
        imagen_url: formData.imagen_url.trim() || null
      };

      if (producto) {
        await productosService.update(producto.id_producto, data);
        toast.success('Producto actualizado correctamente');
      } else {
        await productosService.create(data);
        toast.success('Producto creado correctamente');
      }

      onSaveSuccess();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error(error.response?.data?.message || 'Error al guardar producto');
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
          <i className="bi bi-box-seam me-2"></i>
          {producto ? 'Editar Producto' : 'Nuevo Producto'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control
                  type="text"
                  name="nombre_producto"
                  value={formData.nombre_producto}
                  onChange={handleChange}
                  isInvalid={!!errors.nombre_producto}
                  disabled={loading}
                  placeholder="Ej: Helado Simple 1 Bola"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.nombre_producto}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría *</Form.Label>
                <Form.Select
                  name="id_categoria"
                  value={formData.id_categoria}
                  onChange={handleChange}
                  isInvalid={!!errors.id_categoria}
                  disabled={loading}
                >
                  <option value="">Seleccionar categoría</option>
                  {categoriasCompletas.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.id_categoria}
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
              placeholder="Descripción del producto..."
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio Base (USD) *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="precio_base"
                  value={formData.precio_base}
                  onChange={handleChange}
                  isInvalid={!!errors.precio_base}
                  disabled={loading}
                  placeholder="0.00"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.precio_base}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Costo de Producción (USD) *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="costo_produccion"
                  value={formData.costo_produccion}
                  onChange={handleChange}
                  isInvalid={!!errors.costo_produccion}
                  disabled={loading}
                  placeholder="0.00"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.costo_produccion}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>URL de Imagen</Form.Label>
            <Form.Control
              type="text"
              name="imagen_url"
              value={formData.imagen_url}
              onChange={handleChange}
              disabled={loading}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            <Form.Text className="text-muted">
              Ingresa la URL de la imagen del producto
            </Form.Text>
          </Form.Group>

          {formData.imagen_url && (
            <div className="text-center">
              <img
                src={formData.imagen_url}
                alt="Preview"
                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                className="rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : (producto ? 'Actualizar' : 'Crear')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ProductoFormModal;