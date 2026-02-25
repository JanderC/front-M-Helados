import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RUTAS_ADMIN, RUTAS_DESPENSADOR } from '../../utils/constants';

const Sidebar = ({ showMobile, onHideMobile, collapsed }) => {
  const { isAdmin, user } = useAuth();
  const location = useLocation();
  const rutas = isAdmin ? RUTAS_ADMIN : RUTAS_DESPENSADOR;

  const handleNavClick = () => {
    if (window.innerWidth < 992 && onHideMobile) onHideMobile();
  };

  return (
    <>
      <style>{`
        /* =============================================
           OVERLAY — solo móvil
           ============================================= */
        .sb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26,10,46,0.55);
          backdrop-filter: blur(3px);
          z-index: 1040;
          animation: sb-fade-in 0.2s ease;
        }
        @keyframes sb-fade-in { from { opacity: 0; } to { opacity: 1; } }

        /* =============================================
           PANEL
           ============================================= */
        .sb-panel {
          background: #fff;
          border-right: 1px solid rgba(123,47,190,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;

          /* Desktop: sticky en el flujo normal del flex */
          position: sticky;
          top: 0;
          height: calc(100vh - 60px);

          /* Ancho animado */
          width: 260px;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Colapsado desktop → franja de íconos */
        .sb-panel.desktop-collapsed {
          width: 64px;
        }

        /* Móvil: el panel es fixed y entra/sale */
        @media (max-width: 991px) {
          .sb-panel {
            position: fixed !important;
            top: 60px !important;
            left: 0 !important;
            height: calc(100vh - 60px) !important;
            width: 260px !important;
            z-index: 1045;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        box-shadow 0.3s ease !important;
          }
          .sb-panel.mobile-open {
            transform: translateX(0) !important;
            box-shadow: 8px 0 40px rgba(94,31,150,0.15);
          }
        }

        /* Scrollbar */
        .sb-panel::-webkit-scrollbar { width: 3px; }
        .sb-panel::-webkit-scrollbar-track { background: transparent; }
        .sb-panel::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.25); border-radius: 4px; }

        /* =============================================
           HEADER DEL SIDEBAR
           ============================================= */
        .sb-header {
          background: linear-gradient(135deg, #5E1F96 0%, #7B2FBE 100%);
          padding: 16px;
          position: relative;
          flex-shrink: 0;
          overflow: hidden;
          min-height: 76px;
          display: flex;
          align-items: center;
        }

        .sb-close-btn {
          position: absolute; top: 10px; right: 10px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff; transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .sb-close-btn:hover {
          background: rgba(125,232,216,0.25);
          border-color: rgba(125,232,216,0.4);
        }

        .sb-avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #7DE8D8, #4DCFBD);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1.05rem; color: #1a0a2e;
          box-shadow: 0 4px 12px rgba(125,232,216,0.4);
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .sb-user-info {
          margin-left: 10px;
          overflow: hidden;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .sb-user-name {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.88rem; color: #fff; line-height: 1.2;
          overflow: hidden; text-overflow: ellipsis;
        }
        .sb-user-role {
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem;
          color: rgba(125,232,216,0.9);
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }

        /* Ocultar info de usuario cuando colapsado */
        .sb-panel.desktop-collapsed .sb-user-info {
          opacity: 0;
          width: 0;
          margin-left: 0;
          pointer-events: none;
        }
        .sb-panel.desktop-collapsed .sb-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        /* =============================================
           NAVEGACIÓN
           ============================================= */
        .sb-nav { padding: 10px 8px; flex: 1; overflow-y: auto; overflow-x: hidden; }
        .sb-nav::-webkit-scrollbar { width: 0; }

        .sb-section-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.62rem;
          font-weight: 700; color: #c4b0d8;
          text-transform: uppercase; letter-spacing: 0.12em;
          padding: 0 8px; margin-bottom: 4px; margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          transition: opacity 0.2s ease;
        }
        .sb-panel.desktop-collapsed .sb-section-label {
          opacity: 0;
          height: 0;
          margin: 0;
          padding: 0;
        }

        .sb-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          margin-bottom: 2px;
          text-decoration: none !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          color: #5a4a72 !important;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid transparent;
          white-space: nowrap;
          overflow: hidden;
        }
        .sb-item:hover {
          background: rgba(123,47,190,0.06);
          border-color: rgba(123,47,190,0.12);
          color: #7B2FBE !important;
        }
        .sb-item.active {
          background: linear-gradient(135deg, rgba(123,47,190,0.1), rgba(94,31,150,0.07));
          border-color: rgba(123,47,190,0.2);
          color: #5E1F96 !important;
          font-weight: 700;
          box-shadow: 0 2px 12px rgba(123,47,190,0.1);
        }
        .sb-item.active::before {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px;
          background: linear-gradient(180deg, #7B2FBE, #7DE8D8);
          border-radius: 0 3px 3px 0;
        }

        .sb-icon {
          font-size: 1.15rem;
          min-width: 22px;
          text-align: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .sb-item:hover .sb-icon { transform: scale(1.1); }
        .sb-item.active .sb-icon { color: #7B2FBE; }

        .sb-label {
          transition: opacity 0.2s ease, width 0.3s ease;
          overflow: hidden;
        }

        /* Colapsado: íconos centrados, texto oculto */
        .sb-panel.desktop-collapsed .sb-item {
          padding: 10px;
          justify-content: center;
          gap: 0;
        }
        .sb-panel.desktop-collapsed .sb-label {
          opacity: 0;
          width: 0;
          pointer-events: none;
        }
        .sb-panel.desktop-collapsed .sb-item.active::before {
          top: 15%; bottom: 15%;
        }

        /* Tooltip al hover cuando colapsado */
        .sb-panel.desktop-collapsed .sb-item {
          position: relative;
        }
        .sb-panel.desktop-collapsed .sb-item:hover::after {
          content: attr(data-label);
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1a0a2e;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 8px;
          white-space: nowrap;
          z-index: 2000;
          box-shadow: 0 4px 16px rgba(26,10,46,0.25);
          pointer-events: none;
          animation: tooltip-in 0.15s ease;
        }
        .sb-panel.desktop-collapsed .sb-item:hover::before {
          /* Anular el indicador activo en hover de tooltips */
        }
        .sb-panel.desktop-collapsed .sb-item.active:hover::after {
          content: attr(data-label);
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }

        /* =============================================
           FOOTER
           ============================================= */
        .sb-footer {
          padding: 12px 16px;
          border-top: 1px solid rgba(123,47,190,0.08);
          background: #f5f0fb;
          flex-shrink: 0;
          overflow: hidden;
          transition: padding 0.3s ease;
        }
        .sb-footer-text {
          font-family: 'DM Sans', sans-serif; font-size: 0.68rem;
          color: #c4b0d8; text-align: center; white-space: nowrap;
          transition: opacity 0.2s ease;
        }
        .sb-panel.desktop-collapsed .sb-footer {
          padding: 12px 0;
          display: flex;
          justify-content: center;
        }
        .sb-panel.desktop-collapsed .sb-footer-text {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }
        /* Ícono mini en footer colapsado */
        .sb-footer-icon {
          display: none;
          font-size: 1rem;
          color: #c4b0d8;
        }
        .sb-panel.desktop-collapsed .sb-footer-icon {
          display: block;
        }
      `}</style>

      {/* Overlay móvil */}
      {showMobile && (
        <div className="sb-overlay d-lg-none" onClick={onHideMobile} />
      )}

      {/* Panel principal */}
      <div className={[
        'sb-panel',
        showMobile ? 'mobile-open' : '',
        collapsed ? 'desktop-collapsed' : '',
      ].join(' ')}>

        {/* Header */}
        <div className="sb-header">
          {/* Botón cerrar — solo en móvil */}
          <button className="sb-close-btn d-lg-none" onClick={onHideMobile}>
            <i className="bi bi-x" style={{ fontSize: '1rem' }} />
          </button>

          <div className="sb-avatar">
            {user?.nombre_completo?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div className="sb-user-info">
            <div className="sb-user-name">{user?.nombre_completo || 'Usuario'}</div>
            <div className="sb-user-role">{isAdmin ? 'Administrador' : 'Despensador'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          <div className="sb-section-label">Navegación</div>
          {rutas.map((ruta) => {
            const isActive = location.pathname === ruta.path;
            return (
              <Link
                key={ruta.path}
                to={ruta.path}
                onClick={handleNavClick}
                className={`sb-item ${isActive ? 'active' : ''}`}
                data-label={ruta.name}
              >
                <i className={`bi ${ruta.icon} sb-icon`} />
                <span className="sb-label">{ruta.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <span className="sb-footer-text">M Helados · Sistema de Gestión</span>
          <i className="bi bi-snow sb-footer-icon" />
        </div>
      </div>
    </>
  );
};

export default Sidebar;