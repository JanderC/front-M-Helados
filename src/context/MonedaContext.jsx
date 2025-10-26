import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const MonedaContext = createContext();

export const useMoneda = () => {
  const context = useContext(MonedaContext);
  if (!context) {
    throw new Error('useMoneda debe ser usado dentro de MonedaProvider');
  }
  return context;
};

export const MonedaProvider = ({ children }) => {
  const [monedaActual, setMonedaActual] = useState('COP'); // Por defecto COP (Pesos)
  const [tasaBCV, setTasaBCV] = useState(null);
  const [loadingTasa, setLoadingTasa] = useState(false);

  // Cargar tasa BCV al montar el componente
  useEffect(() => {
    cargarTasaBCV();
  }, []);

  const cargarTasaBCV = async () => {
    try {
      setLoadingTasa(true);
      // Ajusta esta URL según tu configuración de API
      const response = await axios.get('/api/bcv/tasa-actual');
      
      if (response.data.success && response.data.data) {
        setTasaBCV(parseFloat(response.data.data.tasa_cambio_usd));
      }
    } catch (error) {
      console.error('Error al cargar tasa BCV:', error);
      // Si falla, usar una tasa por defecto o la última conocida
      setTasaBCV(50.00); // Tasa por defecto
    } finally {
      setLoadingTasa(false);
    }
  };

  const cambiarMoneda = (nuevaMoneda) => {
    setMonedaActual(nuevaMoneda);
  };

  /**
   * Convertir precio basándose en la moneda actual
   * @param {number} precioCOP - Precio en pesos colombianos
   * @param {number} precioUSD - Precio de referencia en USD
   * @returns {object} - { monto, moneda }
   */
  const convertirPrecio = (precioCOP, precioUSD) => {
    if (monedaActual === 'COP') {
      return {
        monto: parseFloat(precioCOP) || 0,
        moneda: 'COP'
      };
    } else if (monedaActual === 'VES' && precioUSD && tasaBCV) {
      // Convertir de USD a Bolívares usando la tasa BCV
      return {
        monto: parseFloat(precioUSD) * tasaBCV,
        moneda: 'VES'
      };
    } else if (monedaActual === 'USD') {
      return {
        monto: parseFloat(precioUSD) || 0,
        moneda: 'USD'
      };
    }

    // Por defecto retornar en pesos
    return {
      monto: parseFloat(precioCOP) || 0,
      moneda: 'COP'
    };
  };

  const value = {
    monedaActual,
    tasaBCV,
    loadingTasa,
    cambiarMoneda,
    convertirPrecio,
    cargarTasaBCV
  };

  return (
    <MonedaContext.Provider value={value}>
      {children}
    </MonedaContext.Provider>
  );
};