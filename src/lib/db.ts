import Dexie, { type Table } from 'dexie';

// Tipos del schema
export interface Cliente {
  id?: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  createdAt: Date;
}

export interface Compra {
  id?: number;
  kilos: number;
  costoTotal: number;
  saldoProveedor: number;
  fecha: Date;
}

export interface PrecioKg {
  id?: number;
  valor: number;
  fechaActualizacion: Date;
}

export interface Venta {
  id?: number;
  clienteId?: number;
  kilos: number;
  precioKg: number;
  total: number;
  tipoPago: 'contado' | 'fiado';
  abonoInicial?: number;
  fecha: Date;
}

export interface DeudaCliente {
  clienteId: number;
  totalVendido: number;
  totalPagado: number;
  ultimaFecha: Date;
}

export type HistorialTipo = 'compra' | 'pago' | 'editado' | 'venta_rapida';

export interface HistorialCliente {
  id?: number;
  clienteId: number;
  tipo: HistorialTipo;
  descripcion: string;
  datos: {
    kilos?: number;
    total?: number;
    precioKg?: number;
    abono?: number;
    pendiente?: number;
    montoPagado?: number;
    campoEditado?: string;
    valorAnterior?: string;
    valorNuevo?: string;
  };
  fecha: Date;
}

export interface VentaRapida {
  id?: number;
  total: number;
  fecha: Date;
}

// Base de datos
export class AppDatabase extends Dexie {
  clientes!: Table<Cliente, number>;
  compras!: Table<Compra, number>;
  preciosKg!: Table<PrecioKg, number>;
  ventas!: Table<Venta, number>;
  deudasClientes!: Table<DeudaCliente, number>;
  historialClientes!: Table<HistorialCliente, number>;
  ventasRapidas!: Table<VentaRapida, number>;

  constructor() {
    super('AppPlatanoControl');
    this.version(2).stores({
      clientes: '++id, nombre, createdAt',
      compras: '++id, fecha',
      preciosKg: '++id, fechaActualizacion',
      ventas: '++id, clienteId, tipoPago, fecha',
      deudasClientes: 'clienteId, ultimaFecha',
      historialClientes: '++id, clienteId, tipo, fecha',
      ventasRapidas: '++id, fecha',
    });
  }
}

export const db = new AppDatabase();