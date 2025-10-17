import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Table, Badge, Spinner } from 'react-bootstrap';
import { reportesService } from '../../api/services/reportesService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'react-toastify';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const ReportesScreen = () => {
  const [loading, setLoading] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('productos-vendidos');
  const [periodo, setPeriodo] = useState({
    fechaInicio: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0]
  });
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    try {
      setLoading(true);
      let response;

      switch (tipoReporte) {
        case 'productos-vendidos':
          response = await reportesService.getProductosVendidos(periodo);
          break;
        case 'toppings-usados':
          response = await reportesService.getToppingsUsados(periodo);
          break;
        case 'inventario':
          response = await reportesService.getInventario();
          break;
        case 'ventas-categoria':
          response = await reportesService.getVentasPorCategoria(periodo);
          break;
        default:
          response = await reportesService.getProductosVendidos(periodo);
      }

      setDatos(response.data);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      toast.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const generarReporteMensual = async () => {
    try {
      const fecha = new Date(periodo.fechaInicio);
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();

      await reportesService.generarMensual(mes, anio);
      toast.success('Reporte mensual generado correctamente');
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar reporte mensual');
    }
  };

  // Preparar datos para gráficas
  const prepararDatosGrafica = () => {
    if (!datos) return null;

    if (tipoReporte === 'productos-vendidos' || tipoReporte === 'toppings-usados') {
      return {
        labels: datos.map(item => item.nombre),
        datasets: [{
          label: 'Cantidad Vendida',
          data: datos.map(item => item.totalVendidos || item.totalUsados),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1
        }]
      };
    }

    if (tipoReporte === 'ventas-categoria') {
      return {
        labels: datos.map(item => item.categoria),
        datasets: [{
          label: 'Ventas (USD)',
          data: datos.map(item => item.totalVentas),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      };
    }

    return null;
  };

  const datosGrafica = prepararDatosGrafica();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-graph-up me-2 text-primary"></i>
          Reportes
        </h2>
        <Button variant="success" onClick={generarReporteMensual}>
          <i className="bi bi-file-earmark-pdf me-2"></i>
          Generar Reporte Mensual
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Tipo de Reporte</Form.Label>
                <Form.Select
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value)}
                >
                  <option value="productos-vendidos">Productos Más Vendidos</option>
                  <option value="toppings-usados">Toppings Más Usados</option>
                  <option value="ventas-categoria">Ventas por Categoría</option>
                  <option value="inventario">Reporte de Inventario</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {tipoReporte !== 'inventario' && (
              <>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Fecha Inicio</Form.Label>
                    <Form.Control
                      type="date"
                      value={periodo.fechaInicio}
                      onChange={(e) => setPeriodo({ ...periodo, fechaInicio: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Fecha Fin</Form.Label>
                    <Form.Control
                      type="date"
                      value={periodo.fechaFin}
                      onChange={(e) => setPeriodo({ ...periodo, fechaFin: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </>
            )}
            <Col md={2} className="d-flex align-items-end">
              <Button variant="primary" onClick={cargarReporte} className="w-100">
                <i className="bi bi-search me-2"></i>
                Consultar
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Contenido del reporte */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando reporte...</p>
        </div>
      ) : (
        <Row>
          {/* Gráfica */}
          {datosGrafica && (
            <Col lg={6} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Gráfica</h5>
                </Card.Header>
                <Card.Body>
                  {tipoReporte === 'ventas-categoria' ? (
                    <Bar data={datosGrafica} options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: false }
                      }
                    }} />
                  ) : (
                    <Pie data={datosGrafica} options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }} />
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Tabla de datos */}
          <Col lg={datosGrafica ? 6 : 12} className="mb-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Datos</h5>
              </Card.Header>
              <Card.Body>
                {!datos || datos.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                    <p className="mt-3">No hay datos para mostrar</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover>
                      <thead className="table-light">
                        <tr>
                          {tipoReporte === 'productos-vendidos' && (
                            <>
                              <th>#</th>
                              <th>Producto</th>
                              <th>Categoría</th>
                              <th className="text-end">Cantidad</th>
                              <th className="text-end">Total Vendido</th>
                            </>
                          )}
                          {tipoReporte === 'toppings-usados' && (
                            <>
                              <th>#</th>
                              <th>Topping</th>
                              <th className="text-end">Veces Usado</th>
                              <th className="text-end">Total</th>
                            </>
                          )}
                          {tipoReporte === 'inventario' && (
                            <>
                              <th>Producto/Topping</th>
                              <th>Tipo</th>
                              <th className="text-end">Stock</th>
                              <th className="text-end">Stock Mínimo</th>
                              <th>Estado</th>
                            </>
                          )}
                          {tipoReporte === 'ventas-categoria' && (
                            <>
                              <th>Categoría</th>
                              <th className="text-end">Cantidad</th>
                              <th className="text-end">Total Ventas</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {datos.map((item, index) => (
                          <tr key={index}>
                            {tipoReporte === 'productos-vendidos' && (
                              <>
                                <td>{index + 1}</td>
                                <td className="fw-medium">{item.nombre}</td>
                                <td><Badge bg="primary">{item.categoria}</Badge></td>
                                <td className="text-end">{item.totalVendidos}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.totalVentas, 'USD')}
                                </td>
                              </>
                            )}
                            {tipoReporte === 'toppings-usados' && (
                              <>
                                <td>{index + 1}</td>
                                <td className="fw-medium">{item.nombre}</td>
                                <td className="text-end">{item.totalUsados}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.totalVentas, 'USD')}
                                </td>
                              </>
                            )}
                            {tipoReporte === 'inventario' && (
                              <>
                                <td className="fw-medium">{item.nombre}</td>
                                <td><Badge bg="secondary">{item.tipo}</Badge></td>
                                <td className="text-end">{item.stock}</td>
                                <td className="text-end">{item.stockMinimo}</td>
                                <td>
                                  {item.stock <= item.stockMinimo ? (
                                    <Badge bg="danger">Stock Bajo</Badge>
                                  ) : (
                                    <Badge bg="success">Normal</Badge>
                                  )}
                                </td>
                              </>
                            )}
                            {tipoReporte === 'ventas-categoria' && (
                              <>
                                <td className="fw-medium">{item.categoria}</td>
                                <td className="text-end">{item.cantidad}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.totalVentas, 'USD')}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ReportesScreen;