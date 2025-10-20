// Formatear precio con moneda
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }

  const numAmount = parseFloat(amount);

  const simbolos = {
    USD: '$',
    VES: 'Bs.',
    COP: '$'
  };

  const formattedNumber = numAmount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${simbolos[currency] || '$'} ${formattedNumber}`;
};

// Formatear fecha
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return 'Error en fecha';
  }
};

// Formatear fecha y hora
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return 'Error en fecha';
  }
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

// Formatear números con separadores de miles
export const formatNumber = (number, decimals = 2) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0.00';
  }

  const numValue = parseFloat(number);

  return numValue.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Formatear porcentajes
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }

  const numValue = parseFloat(value);

  return `${numValue.toFixed(decimals)}%`;
};