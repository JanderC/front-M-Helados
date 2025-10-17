import { Navbar as BSNavbar, Container, Nav, Dropdown, Badge } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <BSNavbar 
        className="shadow-sm border-bottom" 
        sticky="top"
        style={{
          background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)'
        }}
      >
        <Container fluid>
          <BSNavbar.Brand className="d-flex align-items-center">
            <img 
              src="https://s3.ezgif.com/tmp/ezgif-3ce4002f22b186.png"
              alt="M Helados"
              style={{
                height: '45px',
                width: 'auto'
              }}
            />
          </BSNavbar.Brand>

          <Nav className="ms-auto d-flex align-items-center">
            {/* Indicador de conexión Socket */}
            <div className="me-3">
              <Badge 
                bg={connected ? 'success' : 'danger'} 
                className="d-flex align-items-center"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem'
                }}
              >
                <i className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
                {connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>

            {/* Menú de usuario */}
            <Dropdown align="end">
              <Dropdown.Toggle 
                variant="light" 
                id="dropdown-user" 
                className="d-flex align-items-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  padding: '0.5rem 1rem'
                }}
              >
                <i className="bi bi-person-circle me-2" style={{ fontSize: '1.5rem', color: '#8B4FB8' }}></i>
                <div className="text-start">
                  <div className="fw-bold small" style={{ color: '#333' }}>
                    {user?.nombre_completo}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {user?.rol}
                  </div>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setShowPasswordModal(true)}>
                  <i className="bi bi-key me-2" style={{ color: '#8B4FB8' }}></i>
                  Cambiar Contraseña
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Cerrar Sesión
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </BSNavbar>

      <ChangePasswordModal
        show={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
      />
    </>
  );
};

export default Navbar;