import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

const LoginScreen = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // El useEffect se encargará de redirigir cuando isAuthenticated cambie
    }
    
    setLoading(false);
  };

  return (
    <div 
      className="login-screen min-vh-100 d-flex align-items-center"
      style={{
        background: 'linear-gradient(135deg, #8B4FB8 0%, #6B3FA0 50%, #9D5BC4 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decoración de fondo con círculos */}
      <div 
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(157, 91, 196, 0.3)',
          top: '-100px',
          right: '-100px',
          filter: 'blur(60px)'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(139, 79, 184, 0.3)',
          bottom: '-50px',
          left: '-50px',
          filter: 'blur(60px)'
        }}
      />

      <Container style={{ position: 'relative', zIndex: 1 }}>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card 
              className="border-0"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                borderRadius: '16px'
              }}
            >
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <img 
                      src="https://www.pangeatech.com.uy:85/imagenes/helados.png"
                      alt="M Helados Logo"
                      style={{
                        maxWidth: '280px',
                        width: '100%',
                        height: 'auto'
                      }}
                    />
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                    Sistema de Gestión
                  </p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ color: '#6B3FA0', fontWeight: '500' }}>
                      Usuario
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Ingresa tu usuario"
                      required
                      disabled={loading}
                      autoComplete="username"
                      style={{
                        borderColor: '#E0D4EC',
                        padding: '0.75rem',
                        borderRadius: '8px'
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label style={{ color: '#6B3FA0', fontWeight: '500' }}>
                      Contraseña
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Ingresa tu contraseña"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      style={{
                        borderColor: '#E0D4EC',
                        padding: '0.75rem',
                        borderRadius: '8px'
                      }}
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100"
                    size="lg"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          className="me-2"
                        />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Iniciar Sesión
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <div className="text-center mt-3">
              <small style={{ color: 'rgba(255, 255, 255, 0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                © 2024 M Helados. Todos los derechos reservados.
              </small>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginScreen;