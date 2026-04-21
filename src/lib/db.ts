import Dexie, { type Table } from 'dexie';

// Tipos del schema
export interface Cliente {
  id?: number;
  nombre: string;
  telefono?: string;
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
  fecha: Date;
}

export interface DeudaCliente {
  clienteId: number;
  totalVendido: number;
  totalPagado: number;
  ultimaFecha: Date;
}

// Base de datos
export class AppDatabase extends Dexie {
  clientes!: Table<Cliente, number>;
  compras!: Table<Compra, number>;
  preciosKg!: Table<PrecioKg, number>;
  ventas!: Table<Venta, number>;
  deudasClientes!: Table<DeudaCliente, number>;

  constructor() {
    super('AppPlatanoControl');
    this.version(1).stores({
      clientes: '++id, nombre, createdAt',
      compras: '++id, fecha',
      preciosKg: '++id, fechaActualizacion',
      ventas: '++id, clienteId, tipoPago, fecha',
      deudasClientes: 'clienteId, ultimaFecha',
    });
  }
}

export const db = new AppDatabase();