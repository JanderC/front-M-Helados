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
      
      const dashData = dashResponse.data?.data || dashResponse.data;
      const cajaData = cajaResponse.data?.data || cajaResponse.data;
      
      setDashboardData(dashData);
      setEstadoCaja(cajaData);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener ventas por moneda específica
  const getVentasMoneda = (codigo) => {
    if (!dashboardData?.ventas_por_moneda) return { total_moneda: 0, total_ventas: 0 };
    const venta = dashboardData.ventas_por_moneda.find(v => v.codigo_moneda === codigo);
    return venta || { total_moneda: 0, total_ventas: 0 };
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
      <div className="text-center py-5 px-3">
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)',
            borderRadius: '50%',
            width: '120px',
            height: '120px',
            margin: '0 auto 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="mx-auto"
        >
          <i className="bi bi-clipboard-check" style={{ fontSize: '4rem', color: '#8B4FB8' }}></i>
        </div>
        <h3 style={{ color: '#8B4FB8', fontWeight: '700' }} className="mb-2">Vista de Despensador</h3>
        <p className="text-muted">Consulta los pedidos desde el menú lateral</p>
      </div>
    );
  }

  const ventasUSD = getVentasMoneda('USD');
  const ventasVES = getVentasMoneda('VES');
  const ventasCOP = getVentasMoneda('COP');

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#8B4FB8', fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>
            <i className="bi bi-speedometer2 me-2"></i>
            Dashboard
          </h2>
          <p className="text-muted mb-0 small">Resumen general del sistema</p>
        </div>
        <Badge 
          bg="light" 
          text="dark"
          className="px-3 py-2"
          style={{
            fontSize: '0.85rem',
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
        <Col xs={12}>
          <Card 
            className="border-0 shadow-sm position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              background: estadoCaja?.abierta || estadoCaja?.estado === 'ABIERTA'
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
            }}
          >
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                <div className="text-white">
                  <div className="d-flex align-items-center mb-2">
                    <i 
                      className={`bi ${(estadoCaja?.abierta || estadoCaja?.estado === 'ABIERTA') ? 'bi-cash-stack' : 'bi-lock'} me-2`}
                      style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}
                    ></i>
                    <h4 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}>Estado de Caja</h4>
                  </div>
                  <p className="mb-0 opacity-75 small">
                    {(estadoCaja?.abierta || estadoCaja?.estado === 'ABIERTA') ? 'Operaciones activas' : 'Sin operaciones'}
                  </p>
                </div>
                <Badge 
                  bg="light"
                  className="px-3 px-md-4 py-2"
                  style={{
                    fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                    fontWeight: '700',
                    color: (estadoCaja?.abierta || estadoCaja?.estado === 'ABIERTA') ? '#28a745' : '#dc3545'
                  }}
                >
                  {(estadoCaja?.abierta || estadoCaja?.estado === 'ABIERTA') ? 'ABIERTA' : 'CERRADA'}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tarjetas de ventas por moneda */}
      <Row className="mb-4 g-3 g-md-4">
        {/* Ventas USD */}
        <Col xs={12} sm={6} lg={4}>
          <Card 
            className="border-0 shadow-sm h-100 position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
            }}
          >
            <Card.Body className="p-3 p-md-4 text-white">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '12px', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <i className="bi bi-currency-dollar" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}></i>
                </div>
              </div>
              <p className="mb-1 opacity-75 small" style={{ fontWeight: '500' }}>
                Ventas en Dólares
              </p>
              <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {formatCurrency(ventasUSD.total_moneda, 'USD')}
              </h2>
              <small className="opacity-75 mt-2 d-block">
                {ventasUSD.total_ventas} {ventasUSD.total_ventas === 1 ? 'venta' : 'ventas'}
              </small>
            </Card.Body>
          </Card>
        </Col>

        {/* Ventas VES */}
        <Col xs={12} sm={6} lg={4}>
          <Card 
            className="border-0 shadow-sm h-100 position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
            }}
          >
            <Card.Body className="p-3 p-md-4 text-white">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '12px', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <i className="bi bi-cash-coin" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}></i>
                </div>
              </div>
              <p className="mb-1 opacity-75 small" style={{ fontWeight: '500' }}>
                Ventas en Bolívares
              </p>
              <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {formatCurrency(ventasVES.total_moneda, 'VES')}
              </h2>
              <small className="opacity-75 mt-2 d-block">
                {ventasVES.total_ventas} {ventasVES.total_ventas === 1 ? 'venta' : 'ventas'}
              </small>
            </Card.Body>
          </Card>
        </Col>

        {/* Ventas COP */}
        <Col xs={12} sm={6} lg={4}>
          <Card 
            className="border-0 shadow-sm h-100 position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
            }}
          >
            <Card.Body className="p-3 p-md-4 text-white">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '12px', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <i className="bi bi-cash" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}></i>
                </div>
              </div>
              <p className="mb-1 opacity-75 small" style={{ fontWeight: '500' }}>
                Ventas en Pesos
              </p>
              <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {formatCurrency(ventasCOP.total_moneda, 'COP')}
              </h2>
              <small className="opacity-75 mt-2 d-block">
                {ventasCOP.total_ventas} {ventasCOP.total_ventas === 1 ? 'venta' : 'ventas'}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tarjetas de estadísticas generales */}
      <Row className="mb-4 g-3 g-md-4">
        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(139, 79, 184, 0.1)', 
                    padding: '12px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-bag-check" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', color: '#8B4FB8' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1 small" style={{ fontWeight: '500' }}>
                Total Pedidos Hoy
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#8B4FB8', fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {dashboardData?.resumen_ventas?.total_ventas || 0}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(139, 79, 184, 0.1)', 
                    padding: '12px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-currency-exchange" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', color: '#8B4FB8' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1 small" style={{ fontWeight: '500' }}>
                Total en USD
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#8B4FB8', fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {formatCurrency(dashboardData?.resumen_ventas?.total_usd || 0, 'USD')}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(40, 167, 69, 0.1)', 
                    padding: '12px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-box-seam text-success" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1 small" style={{ fontWeight: '500' }}>
                Productos
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#28a745', fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {dashboardData?.total_productos || 0}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderRadius: '16px' }}
          >
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div 
                  style={{ 
                    background: 'rgba(255, 193, 7, 0.1)', 
                    padding: '12px', 
                    borderRadius: '12px' 
                  }}
                >
                  <i className="bi bi-stars text-warning" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}></i>
                </div>
              </div>
              <p className="text-muted mb-1 small" style={{ fontWeight: '500' }}>
                Toppings
              </p>
              <h2 className="fw-bold mb-0" style={{ color: '#ffc107', fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>
                {dashboardData?.total_toppings || 0}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Productos con stock bajo */}
      {(dashboardData?.inventario_bajo)?.length > 0 && (
        <Row className="mb-4">
          <Col xs={12}>
            <Card 
              className="border-0 shadow-sm"
              style={{ 
                borderRadius: '16px',
                borderLeft: '6px solid #ffc107'
              }}
            >
              <Card.Body className="p-3 p-md-4">
                <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
                  <div 
                    style={{
                      background: 'rgba(255, 193, 7, 0.1)',
                      padding: '10px',
                      borderRadius: '12px'
                    }}
                  >
                    <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '1.3rem' }}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                      Alertas de Stock Bajo
                    </h5>
                    <small className="text-muted">Productos que requieren reabastecimiento</small>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: 'rgba(139, 79, 184, 0.05)' }}>
                      <tr>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Producto
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Stock Actual
                        </th>
                        <th className="d-none d-sm-table-cell" style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Stock Mínimo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData?.inventario_bajo || []).map((producto, index) => (
                        <tr key={index}>
                          <td style={{ padding: '12px', fontWeight: '500', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                            {producto.nombre_topping}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Badge bg="danger" className="px-2 px-md-3 py-1 py-md-2" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)' }}>
                              {producto.stock_actual}
                            </Badge>
                          </td>
                          <td className="d-none d-sm-table-cell" style={{ padding: '12px', color: '#6c757d', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                            {producto.stock_minimo}
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

      {/* Productos más vendidos y Toppings */}
      {(dashboardData?.productos_mas_vendidos || dashboardData?.toppings_mas_usados) && (
        <Row className="g-3 g-md-4">
          <Col xs={12} lg={6}>
            <Card 
              className="border-0 shadow-sm h-100"
              style={{ borderRadius: '16px' }}
            >
              <Card.Body className="p-3 p-md-4">
                <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
                  <div 
                    style={{
                      background: 'rgba(255, 193, 7, 0.1)',
                      padding: '10px',
                      borderRadius: '12px'
                    }}
                  >
                    <i className="bi bi-trophy text-warning" style={{ fontSize: '1.3rem' }}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
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
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Producto
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', textAlign: 'right', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Vendidos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData?.productos_mas_vendidos || []).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-muted">
                            No hay productos vendidos hoy
                          </td>
                        </tr>
                      ) : (
                        (dashboardData?.productos_mas_vendidos || []).map((producto, index) => (
                          <tr key={index}>
                            <td style={{ padding: '12px' }}>
                              <div
                                style={{
                                  background: index < 3 ? 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)' : 'rgba(139, 79, 184, 0.1)',
                                  color: index < 3 ? '#fff' : '#8B4FB8',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '700',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {index + 1}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontWeight: '500', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                              {producto.nombre_producto}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <Badge 
                                style={{
                                  background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
                                  padding: '6px 12px',
                                  fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)'
                                }}
                              >
                                {producto.cantidad}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={6}>
            <Card 
              className="border-0 shadow-sm h-100"
              style={{ borderRadius: '16px' }}
            >
              <Card.Body className="p-3 p-md-4">
                <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
                  <div 
                    style={{
                      background: 'rgba(139, 79, 184, 0.1)',
                      padding: '10px',
                      borderRadius: '12px'
                    }}
                  >
                    <i className="bi bi-stars" style={{ fontSize: '1.3rem', color: '#8B4FB8' }}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
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
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Topping
                        </th>
                        <th style={{ color: '#8B4FB8', fontWeight: '600', border: 'none', padding: '12px', textAlign: 'right', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                          Usados
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData?.toppings_mas_usados || []).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-muted">
                            No hay toppings usados hoy
                          </td>
                        </tr>
                      ) : (
                        (dashboardData?.toppings_mas_usados || []).map((topping, index) => (
                          <tr key={index}>
                            <td style={{ padding: '12px' }}>
                              <div
                                style={{
                                  background: index < 3 ? 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)' : 'rgba(139, 79, 184, 0.1)',
                                  color: index < 3 ? '#fff' : '#8B4FB8',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '700',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {index + 1}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontWeight: '500', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                              {topping.nombre_topping}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <Badge 
                                style={{
                                  background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
                                  padding: '6px 12px',
                                  fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)'
                                }}
                              >
                                {topping.cantidad}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
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