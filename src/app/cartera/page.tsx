'use client';

import { useState, useEffect } from 'react';
import { db, DeudaCliente, Compra, Cliente, Venta, VentaRapida, RegistroGanancia, HistorialCliente } from '@/lib/db';
import styles from './page.module.css';

interface DeudaConNombre extends DeudaCliente {
  nombreCliente?: string;
}

export default function CarteraPage() {
  const [deudas, setDeudas] = useState<DeudaConNombre[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasRapidas, setVentasRapidas] = useState<VentaRapida[]>([]);
  const [registrosGanancias, setRegistrosGanancias] = useState<RegistroGanancia[]>([]);
  const [historialPagos, setHistorialPagos] = useState<HistorialCliente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para modales
  const [mostrarModalSemana, setMostrarModalSemana] = useState(false);
  const [mostrarModalMes, setMostrarModalMes] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Función para obtener el inicio de la semana (lunes)
  function getInicioSemana(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  // Función para obtener el inicio del mes
  function getInicioMes(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  // Formatear período de la semana
  function formatoSemana(inicio: Date, fin: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${inicio.toLocaleDateString('es-CO', options)} - ${fin.toLocaleDateString('es-CO', options)}`;
  }

  // Formatear mes
  function formatoMes(date: Date): string {
    return date.toLocaleDateString('es-CO', { month: 'long' });
  }

  // Función para calcular ganancia de un período
  function calcularGanancia(ventas: Venta[], ventasRapidas: VentaRapida[], compras: Compra[], pagos: HistorialCliente[], inicio: Date): number {
    const ventasFiltradas = ventas.filter(v => new Date(v.fecha) >= inicio);
    const ventasRapidasFiltradas = ventasRapidas.filter(v => new Date(v.fecha) >= inicio);
    const comprasFiltradas = compras.filter(c => new Date(c.fecha) >= inicio);
    const pagosFiltrados = pagos.filter(p => new Date(p.fecha) >= inicio);

    const vendido = ventasFiltradas.reduce((acc, v) => {
      if (v.abonoInicial && v.abonoInicial > 0) {
        return acc + v.abonoInicial;
      }
      return acc + v.total;
    }, 0) + ventasRapidasFiltradas.reduce((acc, v) => acc + v.total, 0);
    
    const sumaPagos = pagosFiltrados.reduce((acc, p) => acc + (p.datos.montoPagado || 0), 0);
    const invertido = comprasFiltradas.reduce((acc, c) => acc + c.costoTotal, 0);
    
    return (vendido + sumaPagos) - invertido;
  }

  // Función para actualizar o crear registro de ganancia
  async function actualizarRegistroGanancia(tipo: 'semana' | 'mes') {
    const hoy = new Date();
    const registros = await db.registroGanancias.filter(r => r.tipo === tipo).toArray();
    
    let inicio: Date;
    let periodo: string;
    
    if (tipo === 'semana') {
      inicio = getInicioSemana(hoy);
      periodo = formatoSemana(inicio, hoy);
    } else {
      inicio = getInicioMes(hoy);
      periodo = formatoMes(inicio);
    }
    
    const todasVentas = await db.ventas.toArray();
    const todasVentasRapidas = await db.ventasRapidas.toArray();
    const todasCompras = await db.compras.toArray();
    const todosPagos = await db.historialClientes.filter(h => h.tipo === 'pago').toArray();
    
    const ganancia = calcularGanancia(todasVentas, todasVentasRapidas, todasCompras, todosPagos, inicio);
    
    // Buscar si existe registro para este período
    const registroExistente = registros.find(r => r.periodo === periodo);
    
    if (registroExistente) {
      // Actualizar existente
      await db.registroGanancias.update(registroExistente.id!, { ganancia });
    } else {
      // Crear nuevo
      await db.registroGanancias.add({
        tipo,
        periodo,
        ganancia,
        fechaCierre: hoy
      });
    }
  }

  // Función para cerrar período anterior
  async function cerrarPeriodoAnterior(tipo: 'semana' | 'mes') {
    const registros = await db.registroGanancias.filter(r => r.tipo === tipo).toArray();
    if (registros.length === 0) return;
    
    const ultimo = registros[registros.length - 1];
    // Simply keep it as is - it will be in the historial
  }

  async function cargarDatos() {
    setCargando(true);
    
    // Actualizar registro de la semana actual
    await actualizarRegistroGanancia('semana');
    await actualizarRegistroGanancia('mes');
    
    // Cargar datos para mostrar
    const todasDeudas = await db.deudasClientes.toArray();
    const todasCompras = await db.compras.toArray();
    const todasVentas = await db.ventas.toArray();
    const ventasRapidasDB = await db.ventasRapidas.toArray();
    const registros = await db.registroGanancias.toArray();
    const pagos = await db.historialClientes.filter(h => h.tipo === 'pago').toArray();
    
    // Cargar nombres de clientes
    const clientesMap = new Map<number, string>();
    for (const deuda of todasDeudas) {
      const cliente = await db.clientes.get(deuda.clienteId);
      if (cliente) clientesMap.set(deuda.clienteId, cliente.nombre);
    }
    
    const deudasConNombres = todasDeudas.map(d => ({
      ...d,
      nombreCliente: clientesMap.get(d.clienteId)
    }));
    
    setDeudas(deudasConNombres);
    setCompras(todasCompras);
    setVentas(todasVentas);
    setVentasRapidas(ventasRapidasDB);
    setRegistrosGanancias(registros);
    setHistorialPagos(pagos);
    
    setCargando(false);
  }

  const totalDeudas = deudas.reduce((acc, d) => acc + (d.totalVendido - d.totalPagado), 0);
  const numeroDeudores = deudas.filter(d => d.totalVendido > d.totalPagado).length;
  
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioSemana = getInicioSemana(hoy);
  const inicioMes = getInicioMes(hoy);
  
  const gananciaHoy = calcularGanancia(ventas, ventasRapidas, compras, historialPagos, inicioHoy);
  const gananciaSemanaActual = calcularGanancia(ventas, ventasRapidas, compras, historialPagos, inicioSemana);
  const gananciaMesActual = calcularGanancia(ventas, ventasRapidas, compras, historialPagos, inicioMes);

  // Solo mostrar registros "cerrados" (períodos anteriores)
  const historialSemanas = registrosGanancias.filter(r => r.tipo === 'semana').sort((a, b) => new Date(b.fechaCierre).getTime() - new Date(a.fechaCierre).getTime());
  const historialMeses = registrosGanancias.filter(r => r.tipo === 'mes').sort((a, b) => new Date(b.fechaCierre).getTime() - new Date(a.fechaCierre).getTime());

  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>Cartera</h1>

      {cargando ? (
        <p className={styles.cargando}>Cargando...</p>
      ) : (
        <>
          <div className={styles.statCardFull}>
            <p className={styles.statLabel}>Dinero en la Calle</p>
            <p className={styles.statValueRojo}>${totalDeudas.toLocaleString('es-CO')}</p>
          </div>

          <h2 className={styles.subtitulo}>Ganancias</h2>
          
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Hoy</p>
              <p className={`${styles.statValue} ${gananciaHoy >= 0 ? styles.positivo : styles.negativo}`}>
                ${gananciaHoy.toLocaleString('es-CO')}
              </p>
            </div>
            <div 
              className={styles.statCardClickable}
              onClick={() => setMostrarModalSemana(true)}
            >
              <p className={styles.statLabel}>Esta semana</p>
              <p className={`${styles.statValue} ${gananciaSemanaActual >= 0 ? styles.positivo : styles.negativo}`}>
                ${gananciaSemanaActual.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div 
            className={styles.statCardFullClickable}
            onClick={() => setMostrarModalMes(true)}
          >
            <p className={styles.statLabel}>Este mes</p>
            <p className={`${styles.statValue} ${gananciaMesActual >= 0 ? styles.positivo : styles.negativo}`}>
              ${gananciaMesActual.toLocaleString('es-CO')}
            </p>
          </div>

          {numeroDeudores > 0 && (
            <div className={styles.listaDeudores}>
              <h2 className={styles.subtitulo}>Clientes con Deuda</h2>
              <p className={styles.statLabel}># Deudores: {numeroDeudores}</p>
              {deudas
                .filter(d => d.totalVendido > d.totalPagado)
                .sort((a, b) => (b.totalVendido - b.totalPagado) - (a.totalVendido - a.totalPagado))
                .map((d) => (
                  <div key={d.clienteId} className={styles.deudorItem}>
                    <span className={styles.deudorNombre}>{d.nombreCliente || `Cliente #${d.clienteId}`}</span>
                    <span className={styles.deudorMonto}>${(d.totalVendido - d.totalPagado).toLocaleString('es-CO')}</span>
                  </div>
                ))}
            </div>
          )}

          {numeroDeudores === 0 && (
            <p className={styles.sinDeuda}>No hay clientes con deuda</p>
          )}
        </>
      )}

      {mostrarModalSemana && (
        <div className={styles.modal} onClick={() => setMostrarModalSemana(false)}>
          <div className={styles.modalContenido} onClick={e => e.stopPropagation()}>
            <h2>Registro Semanal</h2>
            <div className={styles.historialLista}>
              {historialSemanas.length === 0 ? (
                <p className={styles.sinDeuda}>No hay semanas registradas</p>
              ) : (
                historialSemanas.map((r) => (
                  <div key={r.id} className={styles.historialItem}>
                    <span className={styles.historialPeriodo}>{r.periodo}</span>
                    <span className={`${styles.historialGanancia} ${r.ganancia >= 0 ? styles.positivo : styles.negativo}`}>
                      ${r.ganancia.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button className={styles.botonCerrar} onClick={() => setMostrarModalSemana(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {mostrarModalMes && (
        <div className={styles.modal} onClick={() => setMostrarModalMes(false)}>
          <div className={styles.modalContenido} onClick={e => e.stopPropagation()}>
            <h2>Registro Mensual</h2>
            <div className={styles.historialLista}>
              {historialMeses.length === 0 ? (
                <p className={styles.sinDeuda}>No hay meses registrados</p>
              ) : (
                historialMeses.map((r) => (
                  <div key={r.id} className={styles.historialItem}>
                    <span className={styles.historialPeriodo}>{r.periodo}</span>
                    <span className={`${styles.historialGanancia} ${r.ganancia >= 0 ? styles.positivo : styles.negativo}`}>
                      ${r.ganancia.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button className={styles.botonCerrar} onClick={() => setMostrarModalMes(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </main>
  );
}