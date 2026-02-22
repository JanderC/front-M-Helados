import { Navbar as BSNavbar, Container, Nav, Dropdown } from 'react-bootstrap';
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
      <style>{`
        .navbar-custom {
          background: linear-gradient(135deg, #5E1F96 0%, #7B2FBE 60%, #6a28a8 100%) !important;
          border-bottom: 1px solid rgba(125,232,216,0.15) !important;
          box-shadow: 0 2px 20px rgba(94,31,150,0.4) !important;
          height: 60px;
          z-index: 1030;
        }

        .navbar-brand-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.2rem;
          letter-spacing: -0.02em;
          color: #fff !important;
        }
        .navbar-brand-text span {
          color: #7DE8D8;
        }

        .hamburger-btn {
          background: rgba(255,255,255,0.12) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 10px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: #fff;
          padding: 0;
          cursor: pointer;
        }
        .hamburger-btn:hover {
          background: rgba(125,232,216,0.2) !important;
          border-color: rgba(125,232,216,0.4) !important;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          border: 1px solid;
        }
        .status-pill.connected {
          background: rgba(125,232,216,0.18);
          border-color: rgba(125,232,216,0.4);
          color: #7DE8D8;
        }
        .status-pill.disconnected {
          background: rgba(255,100,100,0.15);
          border-color: rgba(255,100,100,0.3);
          color: #fca5a5;
        }
        .status-dot {
          width: 7px; height: 7px; border-radius: 50%;
        }
        .status-dot.connected {
          background: #7DE8D8;
          animation: pulse-dot 2s ease infinite;
        }
        .status-dot.disconnected { background: #fca5a5; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.6); }
        }

        .user-btn {
          background: rgba(255,255,255,0.12) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 12px !important;
          padding: 5px 12px 5px 8px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px;
          transition: all 0.2s ease !important;
          color: #fff !important;
        }
        .user-btn:hover, .show > .user-btn {
          background: rgba(125,232,216,0.18) !important;
          border-color: rgba(125,232,216,0.4) !important;
        }
        .user-btn::after { display: none !important; }

        .user-avatar {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, #7DE8D8, #4DCFBD);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 0.85rem; color: #1a0a2e; flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(125,232,216,0.4);
        }

        .user-info-name {
          font-family: 'DM Sans', sans-serif; font-weight: 600;
          font-size: 0.82rem; color: #fff; line-height: 1.2;
        }
        .user-info-role {
          font-family: 'DM Sans', sans-serif; font-size: 0.68rem;
          color: rgba(125,232,216,0.85); line-height: 1.2;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        .dd-menu {
          background: #fff !important;
          border: 1px solid rgba(123,47,190,0.12) !important;
          border-radius: 14px !important;
          box-shadow: 0 16px 48px rgba(94,31,150,0.2) !important;
          padding: 8px !important;
          min-width: 210px;
          margin-top: 8px !important;
          animation: dd-in 0.16s ease;
        }
        @keyframes dd-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dd-header {
          padding: 8px 12px 12px;
          border-bottom: 1px solid rgba(123,47,190,0.08);
          margin-bottom: 6px;
        }
        .dd-header .dd-name {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.9rem; color: #1a0a2e;
        }
        .dd-header .dd-role {
          font-size: 0.7rem; color: #7B2FBE;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-weight: 600; font-family: 'DM Sans', sans-serif;
        }
        .dd-item {
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
          font-weight: 500; color: #3d2060 !important;
          border-radius: 8px; padding: 9px 12px;
          display: flex; align-items: center; gap: 10px;
          transition: all 0.15s ease;
          background: transparent !important; border: none;
          width: 100%; cursor: pointer; text-decoration: none !important;
        }
        .dd-item:hover { background: rgba(123,47,190,0.07) !important; color: #7B2FBE !important; }
        .dd-item.danger { color: #dc2626 !important; }
        .dd-item.danger:hover { background: rgba(239,68,68,0.07) !important; }
        .dd-sep { border-color: rgba(123,47,190,0.08) !important; margin: 6px 0; }
      `}</style>

      <BSNavbar className="navbar-custom px-2 px-md-3" sticky="top">
        <Container fluid className="gap-2">
          <button className="hamburger-btn d-lg-none me-1" onClick={onToggleSidebar}>
            <i className="bi bi-list" style={{ fontSize: '1.3rem' }}></i>
          </button>

          <BSNavbar.Brand className="d-flex align-items-center gap-2 me-auto p-0">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(125,232,216,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 12px rgba(125,232,216,0.2)'
            }}>
              <img
                src="https://www.pangeatech.com.uy:6068/bot-whatsapp-images/heladitos.png"
                alt="M Helados"
                style={{ height: 26, width: 'auto' }}
              />
            </div>
            <span className="navbar-brand-text d-none d-sm-block">
              M <span>Helados</span>
            </span>
          </BSNavbar.Brand>

          <Nav className="d-flex align-items-center gap-2">
            <div className={`status-pill ${connected ? 'connected' : 'disconnected'} d-none d-sm-flex`}>
              <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
              <span className="d-none d-md-inline">{connected ? 'En línea' : 'Sin conexión'}</span>
            </div>
            <i
              className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'} d-sm-none`}
              style={{ fontSize: '1.1rem', color: connected ? '#7DE8D8' : '#fca5a5' }}
            />

            <Dropdown align="end">
              <Dropdown.Toggle as="button" className="user-btn" id="dropdown-user">
                <div className="user-avatar">
                  {user?.nombre_completo?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="d-none d-md-block text-start">
                  <div className="user-info-name">{user?.nombre_completo}</div>
                  <div className="user-info-role">{user?.rol}</div>
                </div>
                <i className="bi bi-chevron-down d-none d-md-block" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }} />
              </Dropdown.Toggle>

              <Dropdown.Menu className="dd-menu border-0 shadow-none">
                <div className="dd-header">
                  <div className="dd-name">{user?.nombre_completo}</div>
                  <div className="dd-role">{user?.rol}</div>
                </div>
                <button className="dd-item" onClick={() => setShowPasswordModal(true)}>
                  <i className="bi bi-shield-lock" style={{ fontSize: '1rem', color: '#7B2FBE' }} />
                  Cambiar Contraseña
                </button>
                <hr className="dd-sep" />
                <button className="dd-item danger" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right" style={{ fontSize: '1rem' }} />
                  Cerrar Sesión
                </button>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </BSNavbar>

      <ChangePasswordModal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} />
    </>
  );
};

export default Navbar;