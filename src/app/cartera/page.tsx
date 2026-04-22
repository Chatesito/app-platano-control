'use client';

import { useState, useEffect } from 'react';
import { db, DeudaCliente, Compra, Cliente } from '@/lib/db';
import styles from './page.module.css';

interface DeudaConNombre extends DeudaCliente {
  nombreCliente?: string;
}

export default function CarteraPage() {
  const [deudas, setDeudas] = useState<DeudaConNombre[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    
    // Cargar todas las deudas
    const todasDeudas = await db.deudasClientes.toArray();
    
    // Cargar todas las compras (para calcular inversión total)
    const todasCompras = await db.compras.toArray();
    
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
    
    setCargando(false);
  }

  // Calcular totales
  const totalDeudas = deudas.reduce((acc, d) => acc + (d.totalVendido - d.totalPagado), 0);
  const numeroDeudores = deudas.filter(d => d.totalVendido > d.totalPagado).length;
  
  // Ganancia total: suma de todo vendido - suma de todo comprado
  const totalInvertido = compras.reduce((acc, c) => acc + c.costoTotal, 0);
  const totalVendido = deudas.reduce((acc, d) => acc + d.totalVendido, 0);
  const gananciaTotal = totalVendido - totalInvertido;

  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>Cartera</h1>

      {cargando ? (
        <p className={styles.cargando}>Cargando...</p>
      ) : (
        <>
          {/* Estadísticas */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Dinero en la Calle</p>
              <p className={styles.statValue}>${totalDeudas.toLocaleString('es-CO')}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Ganancia Total</p>
              <p className={`${styles.statValue} ${gananciaTotal >= 0 ? styles.positivo : styles.negativo}`}>
                ${gananciaTotal.toLocaleString('es-CO')}
              </p>
            </div>
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