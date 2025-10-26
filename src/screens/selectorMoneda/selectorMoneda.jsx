import { ButtonGroup, Button, Badge } from 'react-bootstrap';
import { useMoneda } from '../../context/MonedaContext';

const SelectorMoneda = () => {
  const { monedaActual, cambiarMoneda, tasaBCV, loadingTasa } = useMoneda();

  const monedas = [
    { codigo: 'COP', nombre: 'Pesos', icono: 'currency-dollar' },
    { codigo: 'VES', nombre: 'Bolívares', icono: 'cash-coin' },
    { codigo: 'USD', nombre: 'Dólares', icono: 'currency-exchange' }
  ];

  return (
    <div className="d-flex align-items-center gap-3">
      <ButtonGroup size="sm">
        {monedas.map((moneda) => (
          <Button
            key={moneda.codigo}
            variant={monedaActual === moneda.codigo ? 'primary' : 'outline-primary'}
            onClick={() => cambiarMoneda(moneda.codigo)}
            className="d-flex align-items-center gap-1"
          >
            <i className={`bi bi-${moneda.icono}`}></i>
            {moneda.nombre}
          </Button>
        ))}
      </ButtonGroup>

      {/* Mostrar tasa BCV cuando esté en bolívares */}
      {monedaActual === 'VES' && tasaBCV && (
        <Badge bg="info" className="d-flex align-items-center gap-1">
          <i className="bi bi-graph-up-arrow"></i>
          Tasa BCV: Bs. {tasaBCV.toFixed(2)}
        </Badge>
      )}

      {loadingTasa && monedaActual === 'VES' && (
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Cargando tasa...</span>
        </div>
      )}
    </div>
  );
};

export default SelectorMoneda;