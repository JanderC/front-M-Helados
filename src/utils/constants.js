// Roles de usuario
export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  DESPENSADOR: 'DESPENSADOR'
};

// Estados de pedidos
export const ESTADOS_PEDIDO = {
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO',
  DEVUELTO: 'DEVUELTO'
};

// Monedas
export const MONEDAS = {
  USD: 'USD',
  VES: 'VES',
  COP: 'COP'
};

// Símbolos de monedas
export const SIMBOLOS_MONEDA = {
  USD: '$',
  VES: 'Bs.',
  COP: 'COP$'
};

// Categorías de productos (ajusta según tu backend)
export const CATEGORIAS = [
  'HELADOS',
  'MALTEADAS',
  'POSTRES',
  'BEBIDAS'
];

// Rutas de navegación por rol
export const RUTAS_ADMIN = [
  { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
  { path: '/productos', name: 'Productos', icon: 'bi-box-seam' },
  { path: '/toppings', name: 'Toppings', icon: 'bi-stars' },
  { path: '/ventas', name: 'Nueva Venta', icon: 'bi-cart-plus' },
  { path: '/ventas/lista', name: 'Lista Ventas', icon: 'bi-list-ul' },
  { path: '/caja', name: 'Flujo de Caja', icon: 'bi-cash-stack' },
  { path: '/reportes', name: 'Reportes', icon: 'bi-graph-up' }
];

export const RUTAS_DESPENSADOR = [
  { path: '/pedidos', name: 'Pedidos', icon: 'bi-clipboard-check' }
];

// Configuración de paginación
export const ITEMS_PER_PAGE = 10;

// Colores para estados
export const COLORES_ESTADO = {
  PENDIENTE: 'warning',
  EN_PROCESO: 'info',
  COMPLETADO: 'success',
  CANCELADO: 'danger',
  DEVUELTO: 'secondary'
};