'use client';

import { useState, useEffect } from 'react';
import { db, Cliente, DeudaCliente, HistorialCliente, PrecioKg, HistorialTipo } from '@/lib/db';
import styles from './page.module.css';

export default function VentaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [deudas, setDeudas] = useState<Map<number, DeudaCliente>>(new Map());
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [ultimoPago, setUltimoPago] = useState<{monto: number, fecha: Date} | null>(null);

  // Modal states
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarModalVentaRapida, setMostrarModalVentaRapida] = useState(false);
  const [mostrarModalNuevoCliente, setMostrarModalNuevoCliente] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  // Form states
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState('');
  const [ventaKilos, setVentaKilos] = useState('');
  const [ventaAbono, setVentaAbono] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');
  const [editarNombre, setEditarNombre] = useState('');
  const [editarTelefono, setEditarTelefono] = useState('');
  const [editarDireccion, setEditarDireccion] = useState('');
  const [ventaRapidaMonto, setVentaRapidaMonto] = useState('');

  // Historial
  const [historial, setHistorial] = useState<HistorialCliente[]>([]);

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (clienteSeleccionado) {
      cargarDeudaCliente(clienteSeleccionado);
      cargarUltimoPago(clienteSeleccionado);
    }
  }, [clienteSeleccionado]);

  async function cargarClientes() {
    const clientesDB = await db.clientes.orderBy('nombre').toArray();
    setClientes(clientesDB);

    const deudasMap = new Map<number, DeudaCliente>();
    for (const cliente of clientesDB) {
      if (cliente.id) {
        const deuda = await db.deudasClientes.where('clienteId').equals(cliente.id).first();
        if (deuda) {
          deudasMap.set(cliente.id, deuda);
        }
      }
    }
    setDeudas(deudasMap);
  }

  async function cargarDeudaCliente(clienteId: number) {
    const deuda = await db.deudasClientes.where('clienteId').equals(clienteId).first();
    if (deuda) {
      setDeudas(prev => new Map(prev).set(clienteId, deuda));
    }
  }

  async function cargarUltimoPago(clienteId: number) {
    const ultimo = await db.historialClientes
      .where('clienteId')
      .equals(clienteId)
      .filter(h => h.tipo === 'pago')
      .reverse()
      .sortBy('fecha');

    if (ultimo && ultimo.length > 0) {
      setUltimoPago({ monto: ultimo[0].datos.montoPagado || 0, fecha: ultimo[0].fecha });
    } else {
      setUltimoPago(null);
    }
  }

  async function cargarHistorial(clienteId: number) {
    const h = await db.historialClientes
      .where('clienteId')
      .equals(clienteId)
      .reverse()
      .sortBy('fecha');
    setHistorial(h);
  }

  // Crear cliente
  async function crearCliente() {
    if (!nuevoClienteNombre.trim()) return;

    const id = await db.clientes.add({
      nombre: nuevoClienteNombre.trim(),
      telefono: nuevoClienteTelefono.trim() || undefined,
      direccion: nuevoClienteDireccion.trim() || undefined,
      createdAt: new Date(),
    });

    await db.deudasClientes.add({
      clienteId: id,
      totalVendido: 0,
      totalPagado: 0,
      ultimaFecha: new Date(),
    });

    await db.historialClientes.add({
      clienteId: id,
      tipo: 'editado',
      descripcion: 'Cliente creado',
      datos: {},
      fecha: new Date(),
    });

    setNuevoClienteNombre('');
    setNuevoClienteTelefono('');
    setNuevoClienteDireccion('');
    setMostrarModalNuevoCliente(false);
    cargarClientes();
  }

  // Registrar venta
  async function registrarVenta() {
    if (!clienteSeleccionado || !ventaKilos) return;

    const precioKg = await db.preciosKg.orderBy('fechaActualizacion').last();
    if (!precioKg) return;

    const k = parseFloat(ventaKilos);
    const total = k * precioKg.valor;
    const abono = ventaAbono ? parseInt(ventaAbono) : 0;
    const pendiente = total - abono;

    // Guardar venta
    await db.ventas.add({
      clienteId: clienteSeleccionado,
      kilos: k,
      precioKg: precioKg.valor,
      total,
      tipoPago: pendiente > 0 ? 'fiado' : 'contado',
      abonoInicial: abono,
      fecha: new Date(),
    });

    // Actualizar deuda
    const deudaActual = await db.deudasClientes.where('clienteId').equals(clienteSeleccionado).first();
    if (deudaActual) {
      await db.deudasClientes.update(clienteSeleccionado, {
        totalVendido: deudaActual.totalVendido + total,
        totalPagado: deudaActual.totalPagado + abono,
        ultimaFecha: new Date(),
      });
    }

    // Historial
    await db.historialClientes.add({
      clienteId: clienteSeleccionado,
      tipo: 'compra',
      descripcion: pendiente > 0 ? `Pagó $${abono}, debe $${pendiente}` : 'Pago completo',
      datos: { kilos: k, total, precioKg: precioKg.valor, abono, pendiente },
      fecha: new Date(),
    });

    setVentaKilos('');
    setVentaAbono('');
    setMostrarModalVenta(false);
    cargarDeudaCliente(clienteSeleccionado);
    cargarUltimoPago(clienteSeleccionado);
  }

  // Registrar pago
  async function registrarPago() {
    if (!clienteSeleccionado || !pagoMonto) return;

    const monto = parseInt(pagoMonto);
    const deudaActual = await db.deudasClientes.where('clienteId').equals(clienteSeleccionado).first();
    if (!deudaActual) return;

    await db.deudasClientes.update(clienteSeleccionado, {
      totalPagado: deudaActual.totalPagado + monto,
      ultimaFecha: new Date(),
    });

    await db.historialClientes.add({
      clienteId: clienteSeleccionado,
      tipo: 'pago',
      descripcion: `Pagó $${monto}`,
      datos: { montoPagado: monto },
      fecha: new Date(),
    });

    setPagoMonto('');
    setMostrarModalPago(false);
    cargarDeudaCliente(clienteSeleccionado);
    cargarUltimoPago(clienteSeleccionado);
  }

  // Editar cliente
  async function editarCliente() {
    if (!clienteSeleccionado || !editarNombre.trim()) return;

    const cliente = await db.clientes.get(clienteSeleccionado);
    if (!cliente) return;

    const cambios: string[] = [];
    if (cliente.nombre !== editarNombre.trim()) {
      cambios.push(`Nombre: ${cliente.nombre} → ${editarNombre.trim()}`);
    }
    if (cliente.telefono !== (editarTelefono.trim() || undefined)) {
      cambios.push(`Teléfono: ${cliente.telefono || 'sin'} → ${editarTelefono.trim() || 'sin'}`);
    }
    if (cliente.direccion !== (editarDireccion.trim() || undefined)) {
      cambios.push(`Dirección: ${cliente.direccion || 'sin'} → ${editarDireccion.trim() || 'sin'}`);
    }

    await db.clientes.update(clienteSeleccionado, {
      nombre: editarNombre.trim(),
      telefono: editarTelefono.trim() || undefined,
      direccion: editarDireccion.trim() || undefined,
    });

    if (cambios.length > 0) {
      await db.historialClientes.add({
        clienteId: clienteSeleccionado,
        tipo: 'editado',
        descripcion: cambios.join(', '),
        datos: { campoEditado: cambios.join(', ') },
        fecha: new Date(),
      });
    }

    setMostrarModalEditar(false);
    cargarClientes();
  }

  // Eliminar cliente
  async function eliminarCliente() {
    if (!clienteSeleccionado) return;

    await db.clientes.delete(clienteSeleccionado);
    await db.deudasClientes.delete(clienteSeleccionado);
    await db.historialClientes.where('clienteId').equals(clienteSeleccionado).delete();

    setClienteSeleccionado(null);
    setMostrarModalEliminar(false);
    cargarClientes();
  }

  // Venta rápida
  async function registrarVentaRapida() {
    if (!ventaRapidaMonto) return;

    const monto = parseInt(ventaRapidaMonto);

    await db.ventasRapidas.add({
      total: monto,
      fecha: new Date(),
    });

    await db.historialClientes.add({
      clienteId: 0, // Venta rápida no tiene cliente
      tipo: 'venta_rapida',
      descripcion: `Venta rápida: $${monto}`,
      datos: { total: monto },
      fecha: new Date(),
    });

    setVentaRapidaMonto('');
    setMostrarModalVentaRapida(false);
  }

  function abrirEditarCliente() {
    const cliente = clientes.find(c => c.id === clienteSeleccionado);
    if (cliente) {
      setEditarNombre(cliente.nombre);
      setEditarTelefono(cliente.telefono || '');
      setEditarDireccion(cliente.direccion || '');
      setMostrarModalEditar(true);
    }
  }

  function abrirHistorial() {
    if (clienteSeleccionado) {
      cargarHistorial(clienteSeleccionado);
      setMostrarModalHistorial(true);
    }
  }

  const deudaActual = clienteSeleccionado ? deudas.get(clienteSeleccionado) : null;
  const clienteActual = clientes.find(c => c.id === clienteSeleccionado);

  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>Registrar Venta</h1>

      {/* Lista de clientes */}
      <div className={styles.listaClientes}>
        {clientes.map(cliente => (
          <div
            key={cliente.id}
            className={`${styles.clienteItem} ${cliente.id === clienteSeleccionado ? styles.seleccionado : ''}`}
            onClick={() => setClienteSeleccionado(cliente.id || null)}
          >
            {cliente.nombre}
            {cliente.id && deudas.get(cliente.id) && (
              <span className={styles.badgeDeuda}>
                ${(deudas.get(cliente.id)!.totalVendido - deudas.get(cliente.id)!.totalPagado).toLocaleString('es-CO')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Botón nuevo cliente */}
      <button className={styles.botonNuevo} onClick={() => setMostrarModalNuevoCliente(true)}>
        + Nuevo Cliente
      </button>

      {/* Botón Venta Rápida */}
      <button className={styles.botonVentaRapida} onClick={() => setMostrarModalVentaRapida(true)}>
        Venta Rápida
      </button>

      {/* Cliente seleccionado - detalles y acciones */}
      {clienteSeleccionado && clienteActual && (
        <div className={styles.clienteExpandido}>
          <div className={styles.clienteInfo}>
            <h2>{clienteActual.nombre}</h2>
            <p className={styles.deuda}>
              Debe: <strong>${deudaActual ? (deudaActual.totalVendido - deudaActual.totalPagado).toLocaleString('es-CO') : '0'}</strong>
            </p>
            {ultimoPago && (
              <p className={styles.ultimoPago}>
                Último pago: ${ultimoPago.monto.toLocaleString('es-CO')} - {ultimoPago.fecha.toLocaleDateString('es-CO')}
              </p>
            )}
            {clienteActual.telefono && <p>Tel: {clienteActual.telefono}</p>}
            {clienteActual.direccion && <p>Dir: {clienteActual.direccion}</p>}
          </div>

          <div className={styles.clienteAcciones}>
            <button className={styles.botonAccion} onClick={() => setMostrarModalVenta(true)}>Venta</button>
            <button className={styles.botonAccion} onClick={() => setMostrarModalPago(true)}>Pago</button>
            <button className={styles.botonAccion} onClick={abrirEditarCliente}>✏️</button>
            <button className={styles.botonAccion} onClick={abrirHistorial}>📋</button>
            <button className={styles.botonAccion} onClick={() => setMostrarModalEliminar(true)}>🗑️</button>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {mostrarModalNuevoCliente && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Nuevo Cliente</h2>
            <input className={styles.input} placeholder="Nombre" value={nuevoClienteNombre} onChange={e => setNuevoClienteNombre(e.target.value)} />
            <input className={styles.input} placeholder="Teléfono (opcional)" value={nuevoClienteTelefono} onChange={e => setNuevoClienteTelefono(e.target.value)} />
            <input className={styles.input} placeholder="Dirección (opcional)" value={nuevoClienteDireccion} onChange={e => setNuevoClienteDireccion(e.target.value)} />
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalNuevoCliente(false)}>Cancelar</button>
              <button className={styles.botonGuardar} onClick={crearCliente}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Venta */}
      {mostrarModalVenta && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Nueva Venta</h2>
            <input className={styles.input} type="number" placeholder="Kilos" value={ventaKilos} onChange={e => setVentaKilos(e.target.value)} />
            <input className={styles.input} type="number" placeholder="Abono inicial ($)" value={ventaAbono} onChange={e => setVentaAbono(e.target.value)} />
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalVenta(false)}>Cancelar</button>
              <button className={styles.botonGuardar} onClick={registrarVenta}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago */}
      {mostrarModalPago && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Registrar Pago</h2>
            <input className={styles.input} type="number" placeholder="Monto ($)" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalPago(false)}>Cancelar</button>
              <button className={styles.botonGuardar} onClick={registrarPago}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {mostrarModalEditar && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Editar Cliente</h2>
            <input className={styles.input} placeholder="Nombre" value={editarNombre} onChange={e => setEditarNombre(e.target.value)} />
            <input className={styles.input} placeholder="Teléfono" value={editarTelefono} onChange={e => setEditarTelefono(e.target.value)} />
            <input className={styles.input} placeholder="Dirección" value={editarDireccion} onChange={e => setEditarDireccion(e.target.value)} />
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalEditar(false)}>Cancelar</button>
              <button className={styles.botonGuardar} onClick={editarCliente}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {mostrarModalHistorial && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Historial</h2>
            <div className={styles.historialLista}>
              {historial.map(h => (
                <div key={h.id} className={`${styles.historialItem} ${styles[h.tipo]}`}>
                  <p className={styles.historialFecha}>{h.fecha.toLocaleDateString('es-CO')}</p>
                  <p className={styles.historialDesc}>{h.descripcion}</p>
                  {h.datos.kilos && <p>Kilos: {h.datos.kilos}</p>}
                  {h.datos.total && <p>Total: ${h.datos.total.toLocaleString('es-CO')}</p>}
                </div>
              ))}
            </div>
            <button className={styles.botonCerrar} onClick={() => setMostrarModalHistorial(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {mostrarModalEliminar && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>¿Eliminar cliente?</h2>
            <p>Se borrarán todos los datos asociados.</p>
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalEliminar(false)}>Cancelar</button>
              <button className={styles.botonEliminar} onClick={eliminarCliente}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Venta Rápida */}
      {mostrarModalVentaRapida && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Venta Rápida</h2>
            <input className={styles.input} type="number" placeholder="Total ($)" value={ventaRapidaMonto} onChange={e => setVentaRapidaMonto(e.target.value)} />
            <div className={styles.modalBotones}>
              <button className={styles.botonCancelar} onClick={() => setMostrarModalVentaRapida(false)}>Cancelar</button>
              <button className={styles.botonGuardar} onClick={registrarVentaRapida}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}