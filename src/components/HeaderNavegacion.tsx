'use client';

import { useRouter } from 'next/navigation';
import styles from './HeaderNavegacion.module.css';

interface HeaderNavegacionProps {
  titulo: string;
}

export default function HeaderNavegacion({ titulo }: HeaderNavegacionProps) {
  const router = useRouter();

  return (
    <header className={styles.header}>
      <button className={styles.botonVolver} onClick={() => router.back()}>
        ← Volver
      </button>
      <h1 className={styles.titulo}>{titulo}</h1>
    </header>
  );
}