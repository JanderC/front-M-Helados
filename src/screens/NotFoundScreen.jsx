import { useNavigate } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';

const NotFoundScreen = () => {
  const navigate = useNavigate();
  
  return (
    <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
      <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '5rem' }}></i>
      <h1 className="mt-4">404 - Página no encontrada</h1>
      <p className="text-muted">La página que buscas no existe</p>
      <Button variant="primary" onClick={() => navigate('/dashboard')}>
        <i className="bi bi-house me-2"></i>
        Volver al Dashboard
      </Button>
    </Container>
  );
};
export default NotFoundScreen;