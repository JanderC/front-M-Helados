import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge } from 'react-bootstrap';
import { reportesService } from '../../api/services/reportesService';
import { cajaService } from '../../api/services/cajaService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [estadoCaja, setEstadoCaja] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashResponse, cajaResponse] = await Promise.all([
        reportesService.getDashboard({ periodo: 'hoy' }),
        cajaService.getEstado()
      ]);
      
      if (dashResponse.data.success) {
        setDashboardData(dashResponse.data.data);
      }
      
      if (cajaResponse.data.success) {
        setEstadoCaja(cajaResponse.data.data);
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" style={{ color: '#8B4FB8', width: '3rem', height: '3rem' }} />
        <p className="mt-3" style={{ color: '#8B4FB8', fontWeight: '500' }}>Cargando dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-5">
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)',
            borderRadius: '50%',
            width: '150px',
            height: '150px',
            margin: '0 auto 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="bi bi-clipboard-check" style={{ fontSize: '5rem', color: '#8B4FB8' }}></i>
        </div>
        <h3 style={{ color: '#8B4FB8', fontWeight: '700' }}>Vista de Despensador</h3>
        <p className="text-muted">Consulta los pedidos desde el menú lateral</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#8B4FB8' }}>
            <i className="bi bi-speedometer2 me-2"></i>
            Dashboard
          </h2>
          <p className="text-muted mb-0">Resumen general del sistema</p>
        </div>
        <Badge 
          bg="light" 
          text="dark"
          className="px-3 py-2"
          style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            border: '2px solid rgba(139, 79, 184, 0.2)'
          }}
        >
          <i className="bi bi-calendar-check me-2" style={{ color: '#8B4FB8' }}></i>
          Hoy
        </Badge>
      </div>

      {/* Estado de Caja */}
      <Row className="mb-4">
        <Col md={12}>
          <Card 
            className="border-0 shadow-sm position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              background: estadoCaja?.abierta 
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
            }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-white">
                  <div className="d-flex align-items-center mb-2">
                    <i 
                      className={`bi ${estadoCaja?.abierta ? 'bi-cash-stack' : 'bi-lock'} me-2`}
                      style={{ fontSize: '2rem' }}
                    ></i>
                    <h4 className="fw-bold mb-0">Estado de Caja</h4>
                  </div>
                  <p className="mb-0 opacity-75">
                    {estadoCaja?.abierta ? 'Operaciones activas' : 'Sin operaciones'}
                  </p>
                </div>
                <div className="text-end">
                  <Badge 
                    bg="light"
                    className="px-4 py-2"
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: estadoCaja?.abierta ? '#28a745' : '#dc3545'
                    }}
                  >
                    {estadoCaja?.abierta ? 'ABIERTA' : 'CERRADA'}
                  </Badge>
                </div>
              </div>
            </Card.Body>
            {/* Decoración */}
            <div
              style={{
                position: 'absolute',
                bottom: '-30px',
                right: '-30px',
                width: '150px',
                height: '150px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tarjetas de estadísticas */}
      <Row className="mb-4 g-4">
        <Col md={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100 position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)'
            }}
          >
            <Card.Body className="p-4 text-white">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '14px', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <i className="bi bi-cart-check" style={{ fontSize: '1.8rem' }}></i>
                </div>
              </div>
              <p className="mb-1 opacity-75" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                Ventas Hoy
              </p>
              <h2 className="fw-bold mb-0">
                {formatCurrency(dashboardData?.ventasHoy || 0, 'USD')}
              </h2>
            </Card.Body>
            {/* Decoración */}
            <div
              style={{
                position: 'absolute',
                bottom: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%'
              }}
            />
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div 
                  style={{ 
                    background: 'rgba(139, 79, 184, 0.1)', 
                    padding: '14px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-bag-check" style={{ fontSize: '1.8rem', color: '#8B4FB8' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                Pedidos Hoy
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#8B4FB8' }}>
                {dashboardData?.pedidosHoy || 0}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div 
                  style={{ 
                    background: 'rgba(40, 167, 69, 0.1)', 
                    padding: '14px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-box-seam text-success" style={{ fontSize: '1.8rem' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                Productos
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#28a745' }}>
                {dashboardData?.totalProductos || 0}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div 
                  style={{ 
                    background: 'rgba(255, 193, 7, 0.1)', 
                    padding: '14px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-stars text-warning" style={{ fontSize: '1.8rem' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                Toppings
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#ffc107' }}>
                {dashboardData?.totalToppings || 0}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Productos con stock bajo */}
      {dashboardData?.productosStockBajo?.length > 0 && (
        <Row className="mb-4">
          <Col md={12}>
            <Card 
              className="border-0 shadow-sm"
              style={{ 
                borderRadius: '16px',
                borderLeft: '6px solid #ffc107'
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div 
                    style={{
                      background: 'rgba(255, 193, 7, 0.1)',
                      padding: '12px',
                      borderRadius: '12px',
                      marginRight: '12px'
                    }}
                  >
                    <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
                      Alertas de Stock Bajo
                    </h5>
                    <small className="text-muted">Productos que requieren reabastecimiento</small>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: 'rgba(139, 79, 184, 0.05)' }}>
                      <tr>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px' }}>
                          Producto
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px' }}>
                          Stock Actual
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px' }}>
                          Stock Mínimo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.productosStockBajo.map((producto) => (
                        <tr key={producto.id}>
                          <td style={{ padding: '12px', fontWeight: '500' }}>{producto.nombre}</td>
                          <td style={{ padding: '12px' }}>
                            <Badge bg="danger" className="px-3 py-2">
                              {producto.stock}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px', color: '#6c757d' }}>{producto.stockMinimo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Productos más vendidos */}
      {dashboardData?.topProductos?.length > 0 && (
        <Row className="g-4">
          <Col md={6}>
            <Card 
              className="border-0 shadow-sm h-100"
              style={{ borderRadius: '16px' }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div 
                    style={{
                      background: 'rgba(255, 193, 7, 0.1)',
                      padding: '12px',
                      borderRadius: '12px',
                      marginRight: '12px'
                    }}
                  >
                    <i className="bi bi-trophy text-warning" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
                      Top 5 Productos
                    </h5>
                    <small className="text-muted">Más vendidos del día</small>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: 'rgba(139, 79, 184, 0.05)' }}>
                      <tr>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', width: '50px' }}>
                          #
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px' }}>
                          Producto
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', textAlign: 'right' }}>
                          Vendidos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topProductos.map((producto, index) => (
                        <tr key={producto.id}>
                          <td style={{ padding: '12px' }}>
                            <div
                              style={{
                                background: index < 3 ? 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)' : 'rgba(139, 79, 184, 0.1)',
                                color: index < 3 ? '#fff' : '#8B4FB8',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.9rem'
                              }}
                            >
                              {index + 1}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: '500' }}>{producto.nombre}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <Badge 
                              style={{
                                background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
                                padding: '8px 16px',
                                fontSize: '0.9rem'
                              }}
                            >
                              {producto.totalVendidos}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card 
              className="border-0 shadow-sm h-100"
              style={{ borderRadius: '16px' }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div 
                    style={{
                      background: 'rgba(139, 79, 184, 0.1)',
                      padding: '12px',
                      borderRadius: '12px',
                      marginRight: '12px'
                    }}
                  >
                    <i className="bi bi-stars" style={{ fontSize: '1.5rem', color: '#8B4FB8' }}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
                      Top 5 Toppings
                    </h5>
                    <small className="text-muted">Más usados del día</small>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: 'rgba(139, 79, 184, 0.05)' }}>
                      <tr>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', width: '50px' }}>
                          #
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px' }}>
                          Topping
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', textAlign: 'right' }}>
                          Usados
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topToppings?.map((topping, index) => (
                        <tr key={topping.id}>
                          <td style={{ padding: '12px' }}>
                            <div
                              style={{
                                background: index < 3 ? 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)' : 'rgba(139, 79, 184, 0.1)',
                                color: index < 3 ? '#fff' : '#8B4FB8',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.9rem'
                              }}
                            >
                              {index + 1}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: '500' }}>{topping.nombre}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <Badge 
                              style={{
                                background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
                                padding: '8px 16px',
                                fontSize: '0.9rem'
                              }}
                            >
                              {topping.totalUsados}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default DashboardScreen;