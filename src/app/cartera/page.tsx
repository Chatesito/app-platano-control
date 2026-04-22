'use client';

import { useState, useEffect } from 'react';
import { db, DeudaCliente, Compra, Cliente, Venta, VentaRapida } from '@/lib/db';
import styles from './page.module.css';

interface DeudaConNombre extends DeudaCliente {
  nombreCliente?: string;
}

export default function CarteraPage() {
  const [deudas, setDeudas] = useState<DeudaConNombre[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [ventas, setVentas] = useState<(Venta | VentaRapida)[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Función para obtener el inicio de la semana (lunes)
  function getInicioSemana(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(now.setDate(diff));
  }

  // Función para obtener el inicio del mes
  function getInicioMes(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  async function cargarDatos() {
    setCargando(true);
    
    // Cargar todas las deudas
    const todasDeudas = await db.deudasClientes.toArray();
    
    // Cargar todas las compras
    const todasCompras = await db.compras.toArray();
    
    // Cargar ventas
    const todasVentas = await db.ventas.toArray();
    const ventasRapidas = await db.ventasRapidas.toArray();
    const todasVentasComb = [...todasVentas, ...ventasRapidas];
    
    // Cargar nombres de clientes
    const clientesMap = new Map<number, string>();
    for (const deuda of todasDeudas) {
      const cliente = await db.clientes.get(deuda.clienteId);
      if (cliente) {
        clientesMap.set(deuda.clienteId, cliente.nombre);
      }
    }
    
    // Agregar nombres a las deudas
    const deudasConNombres = todasDeudas.map(d => ({
      ...d,
      nombreCliente: clientesMap.get(d.clienteId)
    }));
    
    setDeudas(deudasConNombres);
    setCompras(todasCompras);
    setVentas(todasVentasComb);
    
    setCargando(false);
  }

  // Calcular totales generales
  const totalDeudas = deudas.reduce((acc, d) => acc + (d.totalVendido - d.totalPagado), 0);
  const numeroDeudores = deudas.filter(d => d.totalVendido > d.totalPagado).length;
  
  // Ganancia total: suma de todo vendido - suma de todo comprado
  const totalInvertido = compras.reduce((acc, c) => acc + c.costoTotal, 0);
  const totalVendidoGeneral = deudas.reduce((acc, d) => acc + d.totalVendido, 0);
  const gananciaTotal = totalVendidoGeneral - totalInvertido;

  // ========== GANANCIAS DE HOY ==========
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  
  const ventasHoy = ventas.filter(v => new Date(v.fecha) >= inicioHoy);
  const comprasHoy = compras.filter(c => new Date(c.fecha) >= inicioHoy);
  
  const vendidoHoy = ventasHoy.reduce((acc, v) => acc + v.total, 0);
  const invertidoHoy = comprasHoy.reduce((acc, c) => acc + c.costoTotal, 0);
  const gananciaHoy = vendidoHoy - invertidoHoy;

  // ========== GANANCIAS DE LA SEMANA ==========
  const inicioSemana = getInicioSemana();
  
  const ventasSemana = ventas.filter(v => new Date(v.fecha) >= inicioSemana);
  const comprasSemana = compras.filter(c => new Date(c.fecha) >= inicioSemana);
  
  const vendidoSemana = ventasSemana.reduce((acc, v) => acc + v.total, 0);
  const invertidoSemana = comprasSemana.reduce((acc, c) => acc + c.costoTotal, 0);
  const gananciaSemana = vendidoSemana - invertidoSemana;

  // ========== GANANCIAS DEL MES ==========
  const inicioMes = getInicioMes();
  
  const ventasMes = ventas.filter(v => new Date(v.fecha) >= inicioMes);
  const comprasMes = compras.filter(c => new Date(c.fecha) >= inicioMes);
  
  const vendidoMes = ventasMes.reduce((acc, v) => acc + v.total, 0);
  const invertidoMes = comprasMes.reduce((acc, c) => acc + c.costoTotal, 0);
  const gananciaMes = vendidoMes - invertidoMes;

  // Formatear período de la semana
  const formatoSemana = () => {
    const inicio = getInicioSemana();
    const fin = new Date(hoy);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${inicio.toLocaleDateString('es-CO', options)} - ${fin.toLocaleDateString('es-CO', options)}`;
  };

  // Formatear mes actual
  const formatoMes = () => {
    return hoy.toLocaleDateString('es-CO', { month: 'long' });
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>Cartera</h1>

      {cargando ? (
        <p className={styles.cargando}>Cargando...</p>
      ) : (
        <>
          {/* Dinero en la Calle */}
          <div className={styles.statCardFull}>
            <p className={styles.statLabel}>Dinero en la Calle</p>
            <p className={styles.statValueRojo}>${totalDeudas.toLocaleString('es-CO')}</p>
          </div>

          {/* Ganancias por período */}
          <h2 className={styles.subtitulo}>Ganancias</h2>
          
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Hoy</p>
              <p className={`${styles.statValue} ${gananciaHoy >= 0 ? styles.positivo : styles.negativo}`}>
                ${gananciaHoy.toLocaleString('es-CO')}
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>{formatoSemana()}</p>
              <p className={`${styles.statValue} ${gananciaSemana >= 0 ? styles.positivo : styles.negativo}`}>
                ${gananciaSemana.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div className={styles.statCardFull}>
            <p className={styles.statLabel}>{formatoMes()}</p>
            <p className={`${styles.statValue} ${gananciaMes >= 0 ? styles.positivo : styles.negativo}`}>
              ${gananciaMes.toLocaleString('es-CO')}
            </p>
          </div>

          <div className={styles.statCardFull}>
            <p className={styles.statLabel}># Deudores</p>
            <p className={styles.statValue}>{numeroDeudores}</p>
          </div>

          {/* Lista de deudores */}
          {numeroDeudores > 0 && (
            <div className={styles.listaDeudores}>
              <h2 className={styles.subtitulo}>Clientes con Deuda</h2>
              {deudas
                .filter(d => d.totalVendido > d.totalPagado)
                .sort((a, b) => (b.totalVendido - b.totalPagado) - (a.totalVendido - a.totalPagado))
                .map((d) => {
                  const pendiente = d.totalVendido - d.totalPagado;
                  return (
                    <div key={d.clienteId} className={styles.deudorItem}>
                      <span className={styles.deudorNombre}>
                        {d.nombreCliente || `Cliente #${d.clienteId}`}
                      </span>
                      <span className={styles.deudorMonto}>
                        ${pendiente.toLocaleString('es-CO')}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {numeroDeudores === 0 && (
            <p className={styles.sinDeuda}>No hay clientes con deuda</p>
          )}
        </>
      )}
    </main>
  );
}