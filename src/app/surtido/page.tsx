'use client';

import { useState } from 'react';
import { db, Compra } from '@/lib/db';
import styles from './page.module.css';

export default function RegistrarSurtidoPage() {
  const [kilos, setKilos] = useState('');
  const [unidad, setUnidad] = useState<'kg' | 'ton'>('kg');
  const [costoTotal, setCostoTotal] = useState('');
  const [pagadoProveedor, setPagadoProveedor] = useState('');
  const [guardado, setGuardado] = useState(false);

  async function guardar() {
    const k = parseFloat(kilos);
    const c = parseInt(costoTotal);
    const p = pagadoProveedor ? parseInt(pagadoProveedor) : 0;

    if (isNaN(k) || isNaN(c) || k <= 0 || c <= 0) return;

    // Convertir a kilos si es en toneladas
    const kilosReales = unidad === 'ton' ? k * 1000 : k;

    await db.compras.add({
      kilos: kilosReales,
      costoTotal: c,
      saldoProveedor: c - p, // Lo que se debe = total - pagado
      fecha: new Date(),
    });

    setGuardado(true);
    setTimeout(() => {
      setKilos('');
      setCostoTotal('');
      setPagadoProveedor('');
      setGuardado(false);
    }, 2000);
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
    </main>
  );
}