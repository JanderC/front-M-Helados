// Formatear precio con moneda
export const formatCurrency = (amount, currency = 'USD') => {
  const simbolos = {
    USD: '$',
    VES: 'Bs.',
    COP: 'COP$'
  };

  return `${simbolos[currency]} ${parseFloat(amount).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Formatear fecha
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Formatear fecha y hora
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Convertir moneda
export const convertirMoneda = (monto, monedaOrigen, monedaDestino, tasas) => {
  if (monedaOrigen === monedaDestino) return monto;
  
  // Convertir todo a USD primero
  let montoUSD = monto;
  if (monedaOrigen !== 'USD') {
    montoUSD = monto / (tasas[monedaOrigen] || 1);
  }
  
  // Convertir de USD a moneda destino
  if (monedaDestino === 'USD') return montoUSD;
  return montoUSD * (tasas[monedaDestino] || 1);
};

// Calcular total de venta
export const calcularTotalVenta = (items) => {
  return items.reduce((total, item) => {
    const subtotal = item.precio * item.cantidad;
    const toppingsTotal = (item.toppings || []).reduce((sum, t) => sum + t.precio, 0) * item.cantidad;
    return total + subtotal + toppingsTotal;
  }, 0);
};