import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RUTAS_ADMIN, RUTAS_DESPENSADOR } from '../../utils/constants';

const Sidebar = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  
  const rutas = isAdmin ? RUTAS_ADMIN : RUTAS_DESPENSADOR;

  return (
    <div 
      className="sidebar border-end" 
      style={{ 
        minHeight: 'calc(100vh - 56px)', 
        width: '250px',
        background: 'linear-gradient(180deg, #f8f4fb 0%, #faf7fd 50%, #ffffff 100%)',
        borderRight: '2px solid rgba(139, 79, 184, 0.1)'
      }}
    >
      <div className="p-3">
        {/* Header del Sidebar */}
        <div 
          className="text-center mb-4 pb-3"
          style={{
            borderBottom: '2px solid rgba(139, 79, 184, 0.15)'
          }}
        >
          <h6 className="fw-bold mb-1" style={{ color: '#8B4FB8', fontSize: '0.9rem' }}>
            MENÚ
          </h6>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>
            {isAdmin ? 'Administrador' : 'Despensador'}
          </small>
        </div>

        <Nav className="flex-column">
          {rutas.map((ruta) => {
            const isActive = location.pathname === ruta.path;
            
            return (
              <Nav.Link
                key={ruta.path}
                as={Link}
                to={ruta.path}
                className={`d-flex align-items-center py-3 px-3 rounded-3 mb-2 position-relative`}
                style={{
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActive 
                    ? 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)' 
                    : 'transparent',
                  color: isActive ? '#fff' : '#555',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.95rem',
                  boxShadow: isActive ? '0 4px 15px rgba(139, 79, 184, 0.4)' : 'none',
                  border: 'none',
                  transform: isActive ? 'translateX(5px)' : 'translateX(0)',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)';
                    e.currentTarget.style.color = '#8B4FB8';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#555';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                {/* Indicador de activo */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '70%',
                      background: '#fff',
                      borderRadius: '0 4px 4px 0'
                    }}
                  />
                )}
                
                <i 
                  className={`bi ${ruta.icon} me-3`} 
                  style={{ 
                    fontSize: '1.3rem',
                    minWidth: '24px',
                    textAlign: 'center'
                  }}
                ></i>
                <span>{ruta.name}</span>
                
                {/* Efecto de brillo para item activo */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shine 3s ease-in-out infinite'
                    }}
                  />
                )}
              </Nav.Link>
            );
          })}
        </Nav>
      </div>
      
      <style>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          50%, 100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;