'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, Cliente, DeudaCliente, HistorialCliente, PrecioKg, HistorialTipo, VentaRapida } from '@/lib/db';
import styles from './page.module.css';

export default function VentaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [deudas, setDeudas] = useState<Map<number, DeudaCliente>>(new Map());
  const [ultimosPagos, setUltimosPagos] = useState<Map<number, {monto: number, fecha: Date}>>(new Map());
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);

  // Modal states
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarModalVentaRapida, setMostrarModalVentaRapida] = useState(false);
  const [mostrarModalNuevoCliente, setMostrarModalNuevoCliente] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [mostrarModalHistorialVentaRapida, setMostrarModalHistorialVentaRapida] = useState(false);

  // Form states
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState('');
  const [ventaKilos, setVentaKilos] = useState('');
  const [ventaModo, setVentaModo] = useState<'kg' | 'precio'>('kg');
  const [precioKgActual, setPrecioKgActual] = useState<number>(0);
  const [ventaAbono, setVentaAbono] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');
  const [editarNombre, setEditarNombre] = useState('');
  const [editarTelefono, setEditarTelefono] = useState('');
  const [editarDireccion, setEditarDireccion] = useState('');
  const [ventaRapidaMonto, setVentaRapidaMonto] = useState('');

  // Historial
  const [historial, setHistorial] = useState<HistorialCliente[]>([]);
  const [historialFiltrado, setHistorialFiltrado] = useState<HistorialCliente[]>([]);
  const [historialVentaRapida, setHistorialVentaRapida] = useState<VentaRapida[]>([]);
  const [historialVentaRapidaFiltrado, setHistorialVentaRapidaFiltrado] = useState<VentaRapida[]>([]);

  // Filtro por mes (separados para cada historial)
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroMesVentaRapida, setFiltroMesVentaRapida] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (clienteSeleccionado) {
      cargarDeudaCliente(clienteSeleccionado);
      cargarUltimoPago(clienteSeleccionado);
    }
  }, [clienteSeleccionado]);

  // Filtrar historial por mes
  useEffect(() => {
    if (!filtroMes) {
      setHistorialFiltrado(historial);
    } else {
      const [year, month] = filtroMes.split('-').map(Number);
      const filtrado = historial.filter(h => {
        const fecha = new Date(h.fecha);
        return fecha.getFullYear() === year && fecha.getMonth() === month - 1;
      });
      setHistorialFiltrado(filtrado);
    }
  }, [filtroMes, historial]);

  // Filtrar ventas rápida por mes
  useEffect(() => {
    if (!filtroMesVentaRapida) {
      setHistorialVentaRapidaFiltrado(historialVentaRapida);
    } else {
      const [year, month] = filtroMesVentaRapida.split('-').map(Number);
      const filtrado = historialVentaRapida.filter(vr => {
        const fecha = new Date(vr.fecha);
        return fecha.getFullYear() === year && fecha.getMonth() === month - 1;
      });
      setHistorialVentaRapidaFiltrado(filtrado);
    }
  }, [filtroMesVentaRapida, historialVentaRapida]);

  async function cargarClientes() {
    const clientesDB = await db.clientes.toArray();

    const deudasMap = new Map<number, DeudaCliente>();
    const pagosMap = new Map<number, {monto: number, fecha: Date}>();
    
    // Cargar deudas y últimos pagos primero
    for (const cliente of clientesDB) {
      if (cliente.id) {
        const deuda = await db.deudasClientes.where('clienteId').equals(cliente.id).first();
        if (deuda) {
          deudasMap.set(cliente.id, deuda);
        }
        
        // Cargar último pago
        const ultimo = await db.historialClientes
          .where('clienteId')
          .equals(cliente.id)
          .filter(h => h.tipo === 'pago')
          .reverse()
          .sortBy('fecha');
        if (ultimo && ultimo.length > 0) {
          pagosMap.set(cliente.id, { monto: ultimo[0].datos.montoPagado || 0, fecha: ultimo[0].fecha });
        }
      }
    }
    
    // Ordenar clientes por deuda (mayor a menor)
    const clientesOrdenados = clientesDB.sort((a, b) => {
      const deudaA = a.id ? (deudasMap.get(a.id)?.totalVendido || 0) - (deudasMap.get(a.id)?.totalPagado || 0) : 0;
      const deudaB = b.id ? (deudasMap.get(b.id)?.totalVendido || 0) - (deudasMap.get(b.id)?.totalPagado || 0) : 0;
      return deudaB - deudaA;
    });
    
    setClientes(clientesOrdenados);
    setDeudas(deudasMap);
    setUltimosPagos(pagosMap);
  }

  async function cargarDeudaCliente(clienteId: number) {
    const deuda = await db.deudasClientes.where('clienteId').equals(clienteId).first();
    if (deuda) {
      setDeudas(prev => new Map(prev).set(clienteId, deuda));
    }
  }

  async function cargarUltimoPago(clienteId: number) {
    // Buscar en historial de pagos
    const ultimoPago = await db.historialClientes
      .where('clienteId')
      .equals(clienteId)
      .filter(h => h.tipo === 'pago')
      .reverse()
      .sortBy('fecha');

    // Buscar ventas con abono inicial
    const ventasConAbono = await db.ventas
      .where('clienteId')
      .equals(clienteId)
      .filter(v => (v.abonoInicial || 0) > 0)
      .reverse()
      .sortBy('fecha');

    // Determinar cuál es más reciente
    let ultimoPagoData = null;

    if (ultimoPago.length > 0 && ventasConAbono.length > 0) {
      const fechaPago = new Date(ultimoPago[0].fecha).getTime();
      const fechaVenta = new Date(ventasConAbono[0].fecha).getTime();
      if (fechaPago >= fechaVenta) {
        ultimoPagoData = { monto: ultimoPago[0].datos.montoPagado || 0, fecha: ultimoPago[0].fecha };
      } else {
        ultimoPagoData = { monto: ventasConAbono[0].abonoInicial || 0, fecha: ventasConAbono[0].fecha };
      }
    } else if (ultimoPago.length > 0) {
      ultimoPagoData = { monto: ultimoPago[0].datos.montoPagado || 0, fecha: ultimoPago[0].fecha };
    } else if (ventasConAbono.length > 0) {
      ultimoPagoData = { monto: ventasConAbono[0].abonoInicial || 0, fecha: ventasConAbono[0].fecha };
    }

    if (ultimoPagoData) {
      setUltimosPagos(prev => new Map(prev).set(clienteId, ultimoPagoData));
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

  // Eliminar registro del historial
  async function eliminarRegistroHistorial(id: number) {
    if (!confirm('¿Eliminar este registro?')) return;
    
    // Obtener el registro antes de eliminarlo
    const registro = await db.historialClientes.get(id);
    if (!registro) return;

    // Si es una venta ('compra'), actualizar la deuda del cliente Y eliminar de db.ventas
    if (registro.tipo === 'compra' && registro.clienteId) {
      const ventaTotal = registro.datos.total || 0;
      const ventaAbono = registro.datos.abono || 0;
      
      // Buscar y eliminar la venta en db.ventas (por cliente y fecha cercana)
      const ventasCliente = await db.ventas.where('clienteId').equals(registro.clienteId).toArray();
      const fechaRegistro = new Date(registro.fecha).getTime();
      // Buscar venta con fecha dentro del mismo minuto
      const ventaAEliminar = ventasCliente.find(v => {
        const diff = Math.abs(new Date(v.fecha).getTime() - fechaRegistro);
        return diff < 60000; // menos de 1 minuto de diferencia
      });
      
      if (ventaAEliminar) {
        await db.ventas.delete(ventaAEliminar.id!);
      }
      
      // Obtener la deuda actual del cliente
      let deuda = await db.deudasClientes.where('clienteId').equals(registro.clienteId).first();
      
      if (deuda) {
        const nuevoTotalVendido = deuda.totalVendido - ventaTotal;
        // Clamp: totalPagado nunca puede superar a totalVendido (no existen deudas negativas)
        const nuevoTotalPagado = Math.min(
          Math.max(0, deuda.totalPagado - ventaAbono),
          Math.max(0, nuevoTotalVendido)
        );
        
        if (nuevoTotalVendido <= 0) {
          // Si no hay más deuda, crear registro con 0 (no eliminar para poder seguir operando)
          await db.deudasClientes.update(deuda.clienteId, {
            totalVendido: 0,
            totalPagado: 0,
            ultimaFecha: new Date(),
          });
        } else {
          // Actualizar la deuda
          await db.deudasClientes.update(deuda.clienteId, {
            totalVendido: nuevoTotalVendido,
            totalPagado: Math.max(0, nuevoTotalPagado),
            ultimaFecha: new Date(),
          });
        }
      }
    }

    // Si es un pago ('pago'), revertir el monto a la deuda
    if (registro.tipo === 'pago' && registro.clienteId) {
      const montoPagado = registro.datos.montoPagado || 0;
      
      // Obtener la deuda actual del cliente
      let deuda = await db.deudasClientes.where('clienteId').equals(registro.clienteId).first();
      
      if (deuda) {
        // Sumar el monto pagado a la deuda (revertir el pago)
        const nuevoTotalPagado = Math.max(0, deuda.totalPagado - montoPagado);
        
        await db.deudasClientes.update(deuda.clienteId, {
          totalPagado: nuevoTotalPagado,
          ultimaFecha: new Date(),
        });
      }
    }

    // Eliminar el registro del historial
    await db.historialClientes.delete(id);
    
    // Recargar historial y deuda
    if (clienteSeleccionado) {
      cargarHistorial(clienteSeleccionado);
      cargarDeudaCliente(clienteSeleccionado);
      cargarUltimoPago(clienteSeleccionado);
    }
  }

  async function cargarHistorialVentaRapida() {
    const h = await db.ventasRapidas.orderBy('fecha').reverse().toArray();
    setHistorialVentaRapida(h);
  }

  async function eliminarVentaRapida(id: number) {
    if (!confirm('¿Eliminar esta venta?')) return;
    await db.ventasRapidas.delete(id);
    await cargarHistorialVentaRapida();
  }

  // Crear cliente
  async function crearCliente() {
    if (!nuevoClienteNombre.trim()) return;

    // Validar que el nombre solo tenga letras
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(nuevoClienteNombre.trim())) {
      alert('El nombre solo puede contener letras');
      return;
    }

    // Validar que el teléfono solo tenga números (si se ingresa)
    const soloNumeros = /^\d+$/;
    if (nuevoClienteTelefono.trim() && !soloNumeros.test(nuevoClienteTelefono.trim())) {
      alert('El teléfono solo puede contener números');
      return;
    }

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

    const valorIngresado = parseFloat(ventaKilos);
    
    // Validar que no sea negativo
    if (isNaN(valorIngresado) || valorIngresado <= 0) {
      alert('El valor debe ser mayor a 0');
      return;
    }

    // Validar abono negativo
    if (ventaAbono && parseInt(ventaAbono) < 0) {
      alert('El abono no puede ser negativo');
      return;
    }

    const precioKg = await db.preciosKg.orderBy('fechaActualizacion').last();
    if (!precioKg) return;

    let k: number;
    let total: number;

    if (ventaModo === 'kg') {
      // Modo kilos: el usuario ingresa los kilos
      k = valorIngresado;
      total = k * precioKg.valor;
    } else {
      // Modo precio: el usuario ingresa el dinero, se calculan los kilos
      total = valorIngresado;
      k = total / precioKg.valor;
    }

    const abono = ventaAbono ? parseInt(ventaAbono) : 0;
    const pendiente = total - abono;

    // Validar que el abono no exceda el total
    if (abono > total) {
      alert('El abono no puede exceder el total de la venta');
      return;
    }

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
    cargarClientes(); // Actualizar orden
    cargarUltimoPago(clienteSeleccionado);
  }

  // Registrar pago
  async function registrarPago() {
    if (!clienteSeleccionado || !pagoMonto) return;

    const monto = parseInt(pagoMonto);
    
    // Validar que no sea negativo
    if (isNaN(monto) || monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    const deudaActual = await db.deudasClientes.where('clienteId').equals(clienteSeleccionado).first();
    if (!deudaActual) return;

    const deudaAntes = deudaActual.totalVendido - deudaActual.totalPagado;
    
    // Validar que no pague más de lo que debe
    if (monto > deudaAntes) {
      alert(`El cliente solo debe $${deudaAntes.toLocaleString('es-CO')}. No puede pagar más.`);
      return;
    }

    const deudaDespues = deudaAntes - monto;

    await db.deudasClientes.update(clienteSeleccionado, {
      totalPagado: deudaActual.totalPagado + monto,
      ultimaFecha: new Date(),
    });

    await db.historialClientes.add({
      clienteId: clienteSeleccionado,
      tipo: 'pago',
      descripcion: `Pagó $${monto}`,
      datos: { montoPagado: monto, deudaAntes, deudaDespues },
      fecha: new Date(),
    });

    setPagoMonto('');
    setMostrarModalPago(false);
    cargarDeudaCliente(clienteSeleccionado);
    cargarUltimoPago(clienteSeleccionado);
    cargarClientes(); // Actualizar orden
  }

  // Editar cliente
  async function editarCliente() {
    if (!clienteSeleccionado || !editarNombre.trim()) return;

    // Validar que el nombre solo tenga letras y espacios
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(editarNombre.trim())) {
      alert('El nombre solo debe contener letras');
      return;
    }

    // Validar que el teléfono solo tenga números
    const soloNumeros = /^[0-9]*$/;
    if (editarTelefono.trim() && !soloNumeros.test(editarTelefono.trim())) {
      alert('El teléfono solo debe contener números');
      return;
    }

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

  // Eliminar cliente (NO se borra el historial para mantener las ganancias)
  async function eliminarCliente() {
    if (!clienteSeleccionado) return;

    // Verificar si tiene deuda
    const deuda = await db.deudasClientes.where('clienteId').equals(clienteSeleccionado).first();
    const tieneDeuda = deuda && (deuda.totalVendido - deuda.totalPagado) > 0;

    if (tieneDeuda) {
      const confirmado = confirm("Este cliente aún tiene deudas. ¿Seguro que quieres eliminarlo?");
      if (!confirmado) return;
    }

    await db.clientes.delete(clienteSeleccionado);
    await db.deudasClientes.delete(clienteSeleccionado);
    // NO eliminamos el historial de pagos para que las ganancias se mantengan

    setClienteSeleccionado(null);
    setMostrarModalEliminar(false);
    cargarClientes();
  }

  // Venta rápida
  async function registrarVentaRapida() {
    if (!ventaRapidaMonto) return;

    const monto = parseInt(ventaRapidaMonto);

    // Validar que sea mayor a 0
    if (isNaN(monto) || monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    await db.ventasRapidas.add({
      total: monto,
      fecha: new Date(),
    });

    await db.historialClientes.add({
      clienteId: 0,
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

  function abrirHistorialVentaRapida() {
    cargarHistorialVentaRapida();
    setMostrarModalHistorialVentaRapida(true);
  }

  const clienteActual = clientes.find(c => c.id === clienteSeleccionado);

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.botonVolver}>← Volver</Link>
      <h1 className={styles.titulo}>Registrar Venta</h1>

      {/* Botones principales */}
      <button className={styles.botonNuevo} onClick={() => setMostrarModalNuevoCliente(true)}>
        + Nuevo Cliente
      </button>

      <button className={styles.botonVentaRapida} onClick={() => setMostrarModalVentaRapida(true)}>
        Venta Rápida
      </button>

      {/* Lista de clientes con expandido integrado */}
      <div className={styles.listaClientes}>
        {clientes.map(cliente => {
          const deuda = cliente.id ? deudas.get(cliente.id) : null;
          const ultimoPago = cliente.id ? ultimosPagos.get(cliente.id) : null;
          const expandido = cliente.id === clienteSeleccionado;

          return (
            <div key={cliente.id}>
              <div
                className={`${styles.clienteItem} ${expandido ? styles.seleccionado : ''}`}
                onClick={() => setClienteSeleccionado(expandido ? null : cliente.id || null)}
              >
                <span className={styles.nombreCliente}>{cliente.nombre}</span>
                {cliente.id && deuda && (
                  <span className={styles.badgeDeuda}>
                    ${(deuda.totalVendido - deuda.totalPagado).toLocaleString('es-CO')}
                  </span>
                )}
              </div>

              {/* Expandido debajo de cada cliente */}
              {expandido && clienteActual && (
                <div className={styles.clienteExpandido}>
                  <div className={styles.clienteInfo}>
                    <h2>{clienteActual.nombre}</h2>
                    <p className={styles.deuda}>
                      Debe: <strong>${deuda ? (deuda.totalVendido - deuda.totalPagado).toLocaleString('es-CO') : '0'}</strong>
                    </p>
                    {ultimoPago && (
                      <p className={styles.ultimoPago}>
                        Último pago: ${ultimoPago.monto.toLocaleString('es-CO')} - {ultimoPago.fecha.toLocaleDateString('es-CO')}
                      </p>
                    )}
                    {clienteActual.telefono && <p>Tel: {clienteActual.telefono}</p>}
                    {clienteActual.direccion && <p>Dir: {clienteActual.direccion}</p>}
                  </div>

                  <div className={styles.accionesContainer}>
                    <div className={styles.accionesRow}>
                      <button className={styles.botonAccion} onClick={() => setMostrarModalVenta(true)}>Venta</button>
                      <button className={styles.botonAccion} onClick={() => setMostrarModalPago(true)}>Pago</button>
                    </div>
                    <div className={styles.accionesRow}>
                      <button className={styles.botonAccion} onClick={abrirEditarCliente}>✏️</button>
                      <button className={styles.botonAccion} onClick={abrirHistorial}>📋</button>
                      <button className={styles.botonEliminarCliente} onClick={() => setMostrarModalEliminar(true)}>🗑️</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
            
            {/* Toggle Kg / Precio */}
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleBtn} ${ventaModo === 'kg' ? styles.toggleActive : ''}`}
                onClick={() => setVentaModo('kg')}
              >
                Kilos
              </button>
              <button 
                className={`${styles.toggleBtn} ${ventaModo === 'precio' ? styles.toggleActive : ''}`}
                onClick={() => setVentaModo('precio')}
              >
                Precio ($)
              </button>
            </div>

            <input 
              className={styles.input} 
              type="number" 
              placeholder={ventaModo === 'kg' ? 'Kilos' : 'Precio ($)'} 
              value={ventaKilos} 
              onChange={e => setVentaKilos(e.target.value)} 
            />
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
            <input
              type="month"
              className={styles.filtroMes}
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            />
            <div className={styles.historialLista}>
              {historialFiltrado.map(h => (
                <div key={h.id} className={`${styles.historialItem} ${styles[h.tipo]}`}>
                  <div>
                    <p className={styles.historialFecha}>{h.fecha.toLocaleDateString('es-CO')}</p>
                    <p className={styles.historialDesc}>{h.descripcion}</p>
                    {h.datos.kilos && <p>Kilos: {parseFloat(h.datos.kilos.toFixed(1))}</p>}
                    {h.datos.precioKg && <p>Kg a: ${h.datos.precioKg.toLocaleString('es-CO')}</p>}
                    {h.datos.total && <p>Total: ${h.datos.total.toLocaleString('es-CO')}</p>}
                    {h.datos.deudaAntes !== undefined && <p>Debía antes: ${h.datos.deudaAntes.toLocaleString('es-CO')}</p>}
                    {h.datos.deudaDespues !== undefined && <p>Debe ahora: ${h.datos.deudaDespues.toLocaleString('es-CO')}</p>}
                  </div>
                  <button 
                    className={styles.botonEliminarRegistro}
                    onClick={() => eliminarRegistroHistorial(h.id!)}
                  >
                    ✕
                  </button>
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
            <button className={styles.botonHistorial} onClick={abrirHistorialVentaRapida}>
              📋 Ver Historial
            </button>
          </div>
        </div>
      )}

      {/* Modal Historial Venta Rápida */}
      {mostrarModalHistorialVentaRapida && (
        <div className={styles.modal}>
          <div className={styles.modalContenido}>
            <h2>Historial Ventas Rápidas</h2>
            <input
              type="month"
              className={styles.filtroMes}
              value={filtroMesVentaRapida}
              onChange={(e) => setFiltroMesVentaRapida(e.target.value)}
            />
            <div className={styles.historialLista}>
              {historialVentaRapidaFiltrado.map(vr => (
                <div key={vr.id} className={`${styles.historialItem} ${styles.venta_rapida}`}>
                  <div className={styles.historialInfo}>
                    <p className={styles.historialFecha}>{vr.fecha.toLocaleDateString('es-CO')}</p>
                    <p className={styles.historialDesc}>Venta rápida: ${vr.total.toLocaleString('es-CO')}</p>
                  </div>
                  <button 
                    className={styles.botonEliminarRegistro}
                    onClick={() => vr.id && eliminarVentaRapida(vr.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button className={styles.botonCerrar} onClick={() => setMostrarModalHistorialVentaRapida(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </main>
  );
}