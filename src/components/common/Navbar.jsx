import { Navbar as BSNavbar, Container, Nav, Dropdown, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal';

const Navbar = ({ onToggleSidebar }) => {
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
          background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
          zIndex: 1030
        }}
      >
        <Container fluid>
          {/* Botón hamburguesa para móviles */}
          <Button
            variant="light"
            className="d-lg-none me-2"
            onClick={onToggleSidebar}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '0.5rem 0.75rem'
            }}
          >
            <i className="bi bi-list" style={{ fontSize: '1.5rem', color: '#8B4FB8' }}></i>
          </Button>

          <BSNavbar.Brand className="d-flex align-items-center">
            <img 
              src="https://www.pangeatech.com.uy:6068/bot-whatsapp-images/heladitos.png"
              alt="M Helados"
              style={{
                height: '40px',
                width: 'auto'
              }}
              className="d-none d-sm-block"
            />
            <img 
              src="https://www.pangeatech.com.uy:6068/bot-whatsapp-images/heladitos.png"
              alt="M Helados"
              style={{
                height: '32px',
                width: 'auto'
              }}
              className="d-block d-sm-none"
            />
          </BSNavbar.Brand>

          <Nav className="ms-auto d-flex align-items-center">
            {/* Indicador de conexión Socket - Oculto en móviles pequeños */}
            <div className="me-2 me-md-3 d-none d-sm-block">
              <Badge 
                bg={connected ? 'success' : 'danger'} 
                className="d-flex align-items-center"
                style={{
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8rem'
                }}
              >
                <i className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
                <span className="d-none d-md-inline">{connected ? 'Conectado' : 'Desconectado'}</span>
              </Badge>
            </div>

            {/* Indicador solo icono para móviles muy pequeños */}
            <div className="me-2 d-block d-sm-none">
              <i 
                className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'}`}
                style={{
                  fontSize: '1.2rem',
                  color: connected ? '#28a745' : '#dc3545'
                }}
              ></i>
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
                  padding: '0.4rem 0.75rem'
                }}
              >
                <i className="bi bi-person-circle me-2" style={{ fontSize: '1.3rem', color: '#8B4FB8' }}></i>
                <div className="text-start d-none d-md-block">
                  <div className="fw-bold small" style={{ color: '#333' }}>
                    {user?.nombre_completo}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    {user?.rol}
                  </div>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Header className="d-md-none">
                  <div className="fw-bold">{user?.nombre_completo}</div>
                  <small className="text-muted">{user?.rol}</small>
                </Dropdown.Header>
                <Dropdown.Divider className="d-md-none" />
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