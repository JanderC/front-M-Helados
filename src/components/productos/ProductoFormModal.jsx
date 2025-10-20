import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
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
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

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
      setImagePreview(producto.imagen_url || null);
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
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageError('');

    if (!file) {
      return;
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError('Formato de imagen no válido. Use JPG, PNG, GIF o WEBP');
      e.target.value = '';
      return;
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setImageError('La imagen es muy grande. Tamaño máximo: 5MB');
      e.target.value = '';
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData({
        ...formData,
        imagen_url: base64String
      });
      setImagePreview(base64String);
    };
    reader.onerror = () => {
      setImageError('Error al leer la imagen');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      imagen_url: ''
    });
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        imagen_url: formData.imagen_url || null
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

          {/* Sección de Imagen */}
          <Form.Group className="mb-3">
            <Form.Label>Imagen del Producto</Form.Label>
            <Form.Control
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Formatos: JPG, PNG, GIF, WEBP. Tamaño máximo: 5MB
            </Form.Text>
            {imageError && (
              <Alert variant="danger" className="mt-2 mb-0 py-2">
                <i className="bi bi-exclamation-circle me-2"></i>
                {imageError}
              </Alert>
            )}
          </Form.Group>

          {/* Vista previa de imagen */}
          {imagePreview && (
            <div className="text-center mb-3">
              <div className="position-relative d-inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '250px', 
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '2px solid #dee2e6'
                  }}
                  className="shadow-sm"
                />
                <Button
                  variant="danger"
                  size="sm"
                  className="position-absolute top-0 end-0 m-2"
                  onClick={handleRemoveImage}
                  disabled={loading}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                >
                  <i className="bi bi-x-lg"></i>
                </Button>
              </div>
              <div className="mt-2 text-muted small">
                <i className="bi bi-info-circle me-1"></i>
                Vista previa de la imagen
              </div>
            </div>
          )}  
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Guardando...
              </>
            ) : (
              producto ? 'Actualizar' : 'Crear'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ProductoFormModal;