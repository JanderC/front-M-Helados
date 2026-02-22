import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RUTAS_ADMIN, RUTAS_DESPENSADOR } from '../../utils/constants';

const Sidebar = ({ show, onHide }) => {
  const { isAdmin, user } = useAuth();
  const location = useLocation();
  const rutas = isAdmin ? RUTAS_ADMIN : RUTAS_DESPENSADOR;

  const handleNavClick = () => {
    if (window.innerWidth < 992 && onHide) onHide();
  };

  return (
    <>
      <style>{`
        .sidebar-overlay {
          position: fixed; inset: 0;
          background: rgba(26,10,46,0.55);
          backdrop-filter: blur(3px);
          z-index: 1040;
          animation: fade-in 0.2s ease;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

        .sidebar-panel {
          position: fixed;
          top: 60px; left: 0;
          height: calc(100vh - 60px);
          width: 260px;
          z-index: 1045;
          background: #fff;
          border-right: 1px solid rgba(123,47,190,0.1);
          overflow-y: auto; overflow-x: hidden;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; flex-direction: column;
        }
        .sidebar-panel.mobile-hidden {
          transform: translateX(-100%);
          box-shadow: none;
        }
        .sidebar-panel.mobile-visible {
          transform: translateX(0);
          box-shadow: 8px 0 40px rgba(94,31,150,0.15);
        }

        @media (min-width: 992px) {
          .sidebar-panel {
            position: sticky !important;
            top: 60px !important;
            height: calc(100vh - 60px) !important;
            transform: translateX(0) !important;
            box-shadow: none !important;
          }
        }

        .sidebar-panel::-webkit-scrollbar { width: 3px; }
        .sidebar-panel::-webkit-scrollbar-track { background: transparent; }
        .sidebar-panel::-webkit-scrollbar-thumb {
          background: rgba(123,47,190,0.25);
          border-radius: 4px;
        }

        /* Header con gradiente del logo */
        .sidebar-header {
          background: linear-gradient(135deg, #5E1F96 0%, #7B2FBE 100%);
          padding: 18px 16px;
          position: relative;
        }
        .sidebar-close-btn {
          position: absolute; top: 12px; right: 12px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff; transition: all 0.15s ease;
        }
        .sidebar-close-btn:hover {
          background: rgba(125,232,216,0.25);
          border-color: rgba(125,232,216,0.4);
        }

        .sidebar-avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #7DE8D8, #4DCFBD);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1.05rem; color: #1a0a2e; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(125,232,216,0.4);
        }
        .sidebar-user-name {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.88rem; color: #fff; line-height: 1.2;
        }
        .sidebar-user-role {
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem;
          color: rgba(125,232,216,0.9);
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }

        /* Nav */
        .sidebar-nav-section { padding: 12px; flex: 1; }
        .sidebar-section-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.65rem;
          font-weight: 700; color: #c4b0d8;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 0 8px; margin-bottom: 6px; margin-top: 4px;
        }

        .sidebar-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px; margin-bottom: 2px;
          text-decoration: none !important;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
          color: #5a4a72 !important;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
          border: 1px solid transparent;
        }
        .sidebar-nav-item:hover {
          background: rgba(123,47,190,0.06);
          border-color: rgba(123,47,190,0.12);
          color: #7B2FBE !important;
          transform: translateX(3px);
        }
        .sidebar-nav-item.active {
          background: linear-gradient(135deg, rgba(123,47,190,0.1), rgba(94,31,150,0.07));
          border-color: rgba(123,47,190,0.2);
          color: #5E1F96 !important;
          font-weight: 700;
          transform: translateX(4px);
          box-shadow: 0 2px 12px rgba(123,47,190,0.1);
        }
        .sidebar-nav-item.active::before {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px;
          background: linear-gradient(180deg, #7B2FBE, #7DE8D8);
          border-radius: 0 3px 3px 0;
        }

        .sidebar-nav-icon {
          font-size: 1.1rem; min-width: 22px;
          text-align: center; transition: transform 0.2s ease;
        }
        .sidebar-nav-item:hover .sidebar-nav-icon { transform: scale(1.1); }
        .sidebar-nav-item.active .sidebar-nav-icon {
          color: #7B2FBE;
        }

        /* Footer */
        .sidebar-footer {
          padding: 12px 16px;
          border-top: 1px solid rgba(123,47,190,0.08);
          background: #f5f0fb;
        }
        .sidebar-version {
          font-family: 'DM Sans', sans-serif; font-size: 0.68rem;
          color: #c4b0d8; text-align: center;
        }

        .sidebar-spacer { width: 260px; flex-shrink: 0; }
      `}</style>

      {show && <div className="sidebar-overlay d-lg-none" onClick={onHide} />}

      <div className={`sidebar-panel ${show ? 'mobile-visible' : 'mobile-hidden'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <button className="sidebar-close-btn d-lg-none" onClick={onHide}>
            <i className="bi bi-x" style={{ fontSize: '1rem' }} />
          </button>
          <div className="d-flex align-items-center gap-2">
            <div className="sidebar-avatar">
              {user?.nombre_completo?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="sidebar-user-name">{user?.nombre_completo || 'Usuario'}</div>
              <div className="sidebar-user-role">{isAdmin ? 'Administrador' : 'Despensador'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav-section">
          <div className="sidebar-section-label">Navegación</div>
          {rutas.map((ruta) => {
            const isActive = location.pathname === ruta.path;
            return (
              <Link
                key={ruta.path}
                to={ruta.path}
                onClick={handleNavClick}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <i className={`bi ${ruta.icon} sidebar-nav-icon`} />
                <span>{ruta.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-version">M Helados · Sistema de Gestión</div>
        </div>
      </div>

      <div className="sidebar-spacer d-none d-lg-block flex-shrink-0" />
    </>
  );
};

export default Sidebar;