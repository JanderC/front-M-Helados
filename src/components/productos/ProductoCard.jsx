import { Card, Button, Badge } from 'react-bootstrap';
import { formatCurrency } from '../../utils/formatters';

const ProductoCard = ({ producto, onEdit, onDelete }) => {
  return (
    <Card className="h-100 border-0 shadow-sm">
      <div className="position-relative">
        {producto.imagen_url ? (
          <Card.Img
            variant="top"
            src={producto.imagen_url}
            alt={producto.nombre_producto}
            style={{ height: '200px', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : (
          <div
            className="bg-light d-flex align-items-center justify-content-center"
            style={{ height: '200px' }}
          >
            <i className="bi bi-image text-muted" style={{ fontSize: '3rem' }}></i>
          </div>
        )}
        {/* Fallback en caso de error de imagen */}
        <div
          className="bg-light align-items-center justify-content-center"
          style={{ height: '200px', display: 'none' }}
        >
          <i className="bi bi-image-fill text-muted" style={{ fontSize: '3rem' }}></i>
        </div>
        
        <div className="position-absolute top-0 end-0 m-2">
          <Badge bg={producto.disponible ? 'success' : 'danger'}>
            {producto.disponible ? 'Disponible' : 'No disponible'}
          </Badge>
        </div>
      </div>
      
      <Card.Body className="d-flex flex-column">
        <div className="mb-2">
          <Badge bg="primary" className="mb-2">{producto.nombre_categoria}</Badge>
          <Card.Title className="mb-1">{producto.nombre_producto}</Card.Title>
          <Card.Text className="text-muted small mb-2">
            {producto.descripcion || 'Sin descripción'}
          </Card.Text>
        </div>

        <div className="mt-auto">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <small className="text-muted d-block">Precio Base</small>
              <h5 className="mb-0 text-primary fw-bold">
                {formatCurrency(producto.precio_base, 'USD')}
              </h5>
            </div>
            <div className="text-end">
              <small className="text-muted d-block">Costo</small>
              <small className="fw-bold">
                {formatCurrency(producto.costo_produccion, 'USD')}
              </small>
            </div>
          </div>

          <div className="d-grid gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => onEdit(producto)}
            >
              <i className="bi bi-pencil me-1"></i>
              Editar
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onDelete(producto.id_producto)}
            >
              <i className="bi bi-trash me-1"></i>
              Eliminar
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProductoCard;