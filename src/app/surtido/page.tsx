'use client';

import { useState, useEffect } from 'react';
import { db, Compra } from '@/lib/db';
import styles from './page.module.css';

export default function RegistrarSurtidoPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [kilos, setKilos] = useState('');
  const [unidad, setUnidad] = useState<'kg' | 'ton'>('kg');
  const [costoTotal, setCostoTotal] = useState('');
  const [pagadoProveedor, setPagadoProveedor] = useState('');
  const [guardado, setGuardado] = useState(false);

  // Modal states
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<number | null>(null);
  const [pagoMonto, setPagoMonto] = useState('');

  useEffect(() => {
    cargarCompras();
  }, []);

  async function cargarCompras() {
    const todas = await db.compras.orderBy('fecha').reverse().toArray();
    setCompras(todas);
  }

  async function guardar() {
    const k = parseFloat(kilos);
    const c = parseInt(costoTotal);
    const p = pagadoProveedor ? parseInt(pagadoProveedor) : 0;

    if (isNaN(k) || isNaN(c) || k <= 0 || c <= 0) return;
    if (p < 0) return;
    if (p > c) {
      alert('El pago no puede exceder el costo total');
      return;
    }

    const kilosReales = unidad === 'ton' ? k * 1000 : k;

    await db.compras.add({
      kilos: kilosReales,
      costoTotal: c,
      saldoProveedor: c - p,
      fecha: new Date(),
    });

    setGuardado(true);
    setTimeout(() => {
      setKilos('');
      setCostoTotal('');
      setPagadoProveedor('');
      setGuardado(false);
      cargarCompras();
    }, 2000);
  }

  async function registrarPago() {
    if (!compraSeleccionada || !pagoMonto) return;

    const monto = parseInt(pagoMonto);
    if (isNaN(monto) || monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    const compra = compras.find(c => c.id === compraSeleccionada);
    if (!compra) return;

    const nuevoPagado = (compra.costoTotal - compra.saldoProveedor) + monto;
    if (nuevoPagado > compra.costoTotal) {
      alert('El pago total no puede exceder el costo del surtido');
      return;
    }

    await db.compras.update(compraSeleccionada, {
      saldoProveedor: compra.costoTotal - nuevoPagado,
    });

    setPagoMonto('');
    setMostrarModalPago(false);
    setCompraSeleccionada(null);
    cargarCompras();
  }

  function abrirPago(compraId: number) {
    setCompraSeleccionada(compraId);
    setPagoMonto('');
    setMostrarModalPago(true);
  }

  if (guardado) {
    return (
      <main className={styles.main}>
        <div className={styles.exito}>✓ Surtido registrado</div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>Registrar Surtido</h1>

      {/* Formulario */}
      <div className={styles.campo}>
        <label className={styles.label}>Cantidad</label>
        <div className={styles.inputGroup}>
          <input
            type="number"
            className={styles.input}
            value={kilos}
            onChange={(e) => setKilos(e.target.value)}
            placeholder="0"
          />
          <select
            className={styles.select}
            value={unidad}
            onChange={(e) => setUnidad(e.target.value as 'kg' | 'ton')}
          >
            <option value="kg">Kg</option>
            <option value="ton">Ton</option>
          </select>
        </div>
      </div>

      <div className={styles.campo}>
        <label className={styles.label}>Costo total ($)</label>
        <div className={styles.inputGroup}>
          <span className={styles.prefix}>$</span>
          <input
            type="number"
            className={styles.inputConPrefix}
            value={costoTotal}
            onChange={(e) => setCostoTotal(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.campo}>
        <label className={styles.label}>Se pagó al proveedor ($)</label>
        <div className={styles.inputGroup}>
          <span className={styles.prefix}>$</span>
          <input
            type="number"
            className={styles.inputConPrefix}
            value={pagadoProveedor}
            onChange={(e) => setPagadoProveedor(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <button className={styles.boton} onClick={guardar}>
        Guardar
      </button>

      {/* Historial de surtidos */}
      <h2 className={styles.subtitulo}>Historial de Surtidos</h2>
      
      {compras.length === 0 ? (
        <p className={styles.sinDatos}>No hay surtidos registrados</p>
      ) : (
        <div className={styles.historial}>
          {compras.map(compra => {
            const pagado = compra.costoTotal - compra.saldoProveedor;
            const pendiente = compra.saldoProveedor;
            const pagadoCompleto = pendiente === 0;
            
            return (
              <div key={compra.id} className={styles.surtidoItem}>
                <div className={styles.surtidoHeader}>
                  <span className={styles.surtidoFecha}>
                    {compra.fecha.toLocaleDateString('es-CO')}
                  </span>
                  <span className={`${styles.surtidoEstado} ${pagadoCompleto ? styles.pagado : styles.pendiente}`}>
                    {pagadoCompleto ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
                <p className={styles.surtidoDetalle}>Kg: {compra.kilos.toLocaleString('es-CO')}</p>
                <p className={styles.surtidoDetalle}>Costo: ${compra.costoTotal.toLocaleString('es-CO')}</p>
                <p className={styles.surtidoDetalle}>Pagado: ${pagado.toLocaleString('es-CO')}</p>
                <p className={styles.surtidoDetalle}>Pendiente: ${pendiente.toLocaleString('es-CO')}</p>
                
                {!pagadoCompleto && (
                  <button 
                    className={styles.botonPago}
                    onClick={() => abrirPago(compra.id!)}
                  >
                    Añadir Pago
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal añadir pago */}
      {mostrarModalPago && (
        <div className={styles.modal} onClick={() => setMostrarModalPago(false)}>
          <div className={styles.modalContenido} onClick={e => e.stopPropagation()}>
            <h2>Añadir Pago</h2>
            <input 
              className={styles.input} 
              type="number" 
              placeholder="Monto ($)" 
              value={pagoMonto} 
              onChange={e => setPagoMonto(e.target.value)} 
            />
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalPago(false)}>Cancelar</button>
              <button className={styles.botonGuardar} onClick={registrarPago}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}