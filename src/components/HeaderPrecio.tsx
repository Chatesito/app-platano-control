'use client';

import { useState, useEffect } from 'react';
import { db, PrecioKg } from '@/lib/db';
import styles from './HeaderPrecio.module.css';

export default function HeaderPrecio() {
  const [precio, setPrecio] = useState<number | null>(null);
  const [editando, setEditando] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Cargar precio al iniciar
  useEffect(() => {
    cargarPrecio();
  }, []);

  async function cargarPrecio() {
    const ultimoPrecio = await db.preciosKg.orderBy('fechaActualizacion').last();
    if (ultimoPrecio) {
      setPrecio(ultimoPrecio.valor);
    }
  }

  async function guardarPrecio() {
    const nuevoPrecio = parseInt(inputValue);
    if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) return;

    // No guardar si es el mismo precio
    if (nuevoPrecio === precio) {
      setEditando(false);
      return;
    }

    await db.preciosKg.add({
      valor: nuevoPrecio,
      fechaActualizacion: new Date(),
    });

    setPrecio(nuevoPrecio);
    setEditando(false);
  }

  function handleGuardarYCerrar(e: React.MouseEvent) {
    e.stopPropagation();
    guardarPrecio();
  }

  if (editando) {
    return (
      <header className={styles.header} onClick={handleGuardarYCerrar}>
        <span className={styles.label}>Kg a $</span>
        <input
          type="number"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="0"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
        <button className={styles.btnGuardar} onClick={handleGuardarYCerrar}>
          ✓
        </button>
      </header>
    );
  }

  return (
    <header className={styles.header} onClick={() => {
      setInputValue(precio?.toString() || '');
      setEditando(true);
    }}>
      <span className={styles.label}>Kg:</span>
      <span className={styles.precio}>
        ${precio ? precio.toLocaleString('es-CO') : '---'}
      </span>
      <span className={styles.editHint}>tocar para cambiar</span>
    </header>
  );
}