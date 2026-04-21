import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>App Platano</h1>

      <nav className={styles.nav}>
        <Link href="/surtido" className={styles.boton}>
          Registrar Surtido
        </Link>
        <Link href="/venta" className={styles.boton}>
          Registrar Venta
        </Link>
        <Link href="/cartera" className={styles.boton}>
          Cartera
        </Link>
      </nav>
    </main>
  );
}