import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Table, Badge, Spinner, Modal } from 'react-bootstrap';
import { reportesService } from '../../api/services/reportesService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  generarPDFReporteMensual, 
  generarPDFProductosVendidos, 
  generarPDFToppingsUsados,
  generarPDFInventario 
} from '../../utils/pdfGenerator';
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
  const [showModalMensual, setShowModalMensual] = useState(false);
  const [reporteMensual, setReporteMensual] = useState({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });
  const [generandoMensual, setGenerandoMensual] = useState(false);

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    try {
      setLoading(true);
      let response;

      switch (tipoReporte) {
        case 'productos-vendidos':
          response = await reportesService.getProductosVendidos({
            fecha_inicio: periodo.fechaInicio,
            fecha_fin: periodo.fechaFin
          });
          break;
        case 'toppings-usados':
          response = await reportesService.getToppingsUsados({
            fecha_inicio: periodo.fechaInicio,
            fecha_fin: periodo.fechaFin
          });
          break;
        case 'inventario':
          response = await reportesService.getReporteInventario();
          break;
        case 'ventas-categoria':
          response = await reportesService.getVentasPorCategoria({
            fecha_inicio: periodo.fechaInicio,
            fecha_fin: periodo.fechaFin
          });
          break;
        default:
          response = await reportesService.getProductosVendidos({
            fecha_inicio: periodo.fechaInicio,
            fecha_fin: periodo.fechaFin
          });
      }

      // Extraer correctamente los datos según la estructura de la API
      const datosExtraidos = response.data?.data || response.data || [];
      setDatos(Array.isArray(datosExtraidos) ? datosExtraidos : 
              (datosExtraidos.toppings || datosExtraidos.materias_primas ? datosExtraidos : []));
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      toast.error('Error al cargar reporte');
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  const generarReporteMensual = async () => {
    try {
      setGenerandoMensual(true);
      
      // Generar el reporte en la base de datos
      const response = await reportesService.generarReporteMensual(
        reporteMensual.mes, 
        reporteMensual.anio
      );

      if (response.data?.success) {
        toast.success('Reporte mensual generado correctamente');
        
        // Generar y descargar el PDF
        const reporteData = response.data.data;
        generarPDFReporteMensual(reporteData);
        
        setShowModalMensual(false);
      }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error(error.response?.data?.message || 'Error al generar reporte mensual');
    } finally {
      setGenerandoMensual(false);
    }
  };

  const descargarPDFReporte = () => {
    if (!datos || (Array.isArray(datos) && datos.length === 0)) {
      toast.warning('No hay datos para generar el PDF');
      return;
    }

    try {
      switch (tipoReporte) {
        case 'productos-vendidos':
          generarPDFProductosVendidos(datos, periodo.fechaInicio, periodo.fechaFin);
          break;
        case 'toppings-usados':
          generarPDFToppingsUsados(datos, periodo.fechaInicio, periodo.fechaFin);
          break;
        case 'inventario':
          generarPDFInventario(datos);
          break;
        case 'ventas-categoria':
          toast.info('Generación de PDF para ventas por categoría en desarrollo');
          break;
        default:
          toast.warning('Tipo de reporte no soportado para PDF');
      }
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  // Preparar datos para gráficas
  const prepararDatosGrafica = () => {
    if (!datos || (Array.isArray(datos) && datos.length === 0)) return null;

    // Para inventario, no mostrar gráfica
    if (tipoReporte === 'inventario') return null;

    if (tipoReporte === 'productos-vendidos') {
      const datosArray = Array.isArray(datos) ? datos : [];
      return {
        labels: datosArray.map(item => item.nombre_producto || item.nombre || 'Sin nombre'),
        datasets: [{
          label: 'Cantidad Vendida',
          data: datosArray.map(item => parseInt(item.cantidad_total || item.total_vendidos || item.cantidad || 0)),
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

    if (tipoReporte === 'toppings-usados') {
      const datosArray = Array.isArray(datos) ? datos : [];
      return {
        labels: datosArray.map(item => item.nombre_topping || item.nombre || 'Sin nombre'),
        datasets: [{
          label: 'Veces Usado',
          data: datosArray.map(item => parseInt(item.veces_usado || item.total_usados || item.cantidad || 0)),
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
      const datosArray = Array.isArray(datos) ? datos : [];
      return {
        labels: datosArray.map(item => item.nombre_categoria || item.categoria || 'Sin categoría'),
        datasets: [{
          label: 'Ventas (USD)',
          data: datosArray.map(item => parseFloat(item.ingresos_totales || item.total_ventas || 0)),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      };
    }

    return null;
  };

  const datosGrafica = prepararDatosGrafica();

  // Renderizar datos de inventario
  const renderInventario = () => {
    if (!datos || (!datos.toppings && !datos.materias_primas)) {
      return (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
          <p className="mt-3">No hay datos de inventario</p>
        </div>
      );
    }

    return (
      <>
        {/* Toppings */}
        {datos.toppings && datos.toppings.length > 0 && (
          <div className="mb-4">
            <h5 className="mb-3">Toppings</h5>
            <Table hover responsive>
              <thead className="table-light">
                <tr>
                  <th>Topping</th>
                  <th className="text-end">Stock Actual</th>
                  <th className="text-end">Stock Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.toppings.map((item, index) => (
                  <tr key={index}>
                    <td className="fw-medium">{item.nombre_topping}</td>
                    <td className="text-end">{item.stock_actual}</td>
                    <td className="text-end">{item.stock_minimo}</td>
                    <td>
                      {item.nivel_stock === 'BAJO' && <Badge bg="danger">Stock Bajo</Badge>}
                      {item.nivel_stock === 'MEDIO' && <Badge bg="warning">Stock Medio</Badge>}
                      {item.nivel_stock === 'ALTO' && <Badge bg="success">Stock Alto</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Materias Primas */}
        {datos.materias_primas && datos.materias_primas.length > 0 && (
          <div>
            <h5 className="mb-3">Materias Primas</h5>
            <Table hover responsive>
              <thead className="table-light">
                <tr>
                  <th>Materia Prima</th>
                  <th className="text-end">Cantidad Actual</th>
                  <th className="text-end">Cantidad Mínima</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.materias_primas.map((item, index) => (
                  <tr key={index}>
                    <td className="fw-medium">{item.nombre_materia}</td>
                    <td className="text-end">{item.cantidad_actual}</td>
                    <td className="text-end">{item.cantidad_minima}</td>
                    <td>
                      {item.nivel_stock === 'BAJO' && <Badge bg="danger">Stock Bajo</Badge>}
                      {item.nivel_stock === 'MEDIO' && <Badge bg="warning">Stock Medio</Badge>}
                      {item.nivel_stock === 'ALTO' && <Badge bg="success">Stock Alto</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-graph-up me-2 text-primary"></i>
          Reportes
        </h2>
        <div>
          <Button 
            variant="success" 
            onClick={() => setShowModalMensual(true)}
            className="me-2"
          >
            <i className="bi bi-file-earmark-pdf me-2"></i>
            Generar Reporte Mensual
          </Button>
          <Button 
            variant="danger" 
            onClick={descargarPDFReporte}
            disabled={!datos || (Array.isArray(datos) && datos.length === 0)}
          >
            <i className="bi bi-download me-2"></i>
            Descargar PDF
          </Button>
        </div>
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
                {tipoReporte === 'inventario' ? (
                  renderInventario()
                ) : !datos || !Array.isArray(datos) || datos.length === 0 ? (
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
                          <tr key={item.id || index}>
                            {tipoReporte === 'productos-vendidos' && (
                              <>
                                <td>{index + 1}</td>
                                <td className="fw-medium">{item.nombre_producto || item.nombre}</td>
                                <td><Badge bg="primary">{item.nombre_categoria || item.categoria}</Badge></td>
                                <td className="text-end">{item.cantidad_total || item.total_vendidos || item.cantidad || 0}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.ingresos_totales || item.total_ventas || 0, 'USD')}
                                </td>
                              </>
                            )}
                            {tipoReporte === 'toppings-usados' && (
                              <>
                                <td>{index + 1}</td>
                                <td className="fw-medium">{item.nombre_topping || item.nombre}</td>
                                <td className="text-end">{item.veces_usado || item.total_usados || item.cantidad || 0}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.ingresos_totales || item.total_ventas || 0, 'USD')}
                                </td>
                              </>
                            )}
                            {tipoReporte === 'ventas-categoria' && (
                              <>
                                <td className="fw-medium">{item.nombre_categoria || item.categoria}</td>
                                <td className="text-end">{item.productos_vendidos || item.cantidad || 0}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(item.ingresos_totales || item.total_ventas || 0, 'USD')}
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

      {/* Modal para generar reporte mensual */}
      <Modal show={showModalMensual} onHide={() => setShowModalMensual(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Generar Reporte Mensual</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mes</Form.Label>
                  <Form.Select
                    value={reporteMensual.mes}
                    onChange={(e) => setReporteMensual({ ...reporteMensual, mes: parseInt(e.target.value) })}
                  >
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Año</Form.Label>
                  <Form.Control
                    type="number"
                    value={reporteMensual.anio}
                    onChange={(e) => setReporteMensual({ ...reporteMensual, anio: parseInt(e.target.value) })}
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalMensual(false)}>
            Cancelar
          </Button>
          <Button 
            variant="success" 
            onClick={generarReporteMensual}
            disabled={generandoMensual}
          >
            {generandoMensual ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Generando...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-pdf me-2"></i>
                Generar PDF
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReportesScreen;