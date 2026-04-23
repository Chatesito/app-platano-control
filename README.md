# App Platano Control

Aplicación móvil 100% offline para gestionar la venta de plátano. Diseño específico para usarse bajo el sol, con botones grandes y interfaz oscura.

## Características

- **100% Offline** — Sin internet, sin nube, todo funciona local
- **Registrar Surtido** — Compras al proveedor con control de deuda
- **Registrar Ventas** — Clientes, kilos, fiado/contado, abonos
- **Cartera** — Dinero en la calle, deuda de surtido, ganancias (hoy/semana/mes)
- **Historiales** — Filtrables por mes

## Tech Stack

- Next.js + TypeScript
- Dexie.js (IndexedDB)
- Capacitor (APK Android)

## Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build producción
npm run build

# Generar APK
npx cap sync
cd android && ./gradlew.bat assembleDebug
```

## APK

El archivo compilado está en `App Platano Control.apk` o en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Instalación en Android

1. Transferir el APK al teléfono
2. En Ajustes → Seguridad, habilitar "Instalar aplicaciones de fuentes desconocidas"
3. Abrir el APK e instalar

## Notas

- El precio del kg se configura tocando el valor en el header (aparece en todas las páginas)
- Las ganancias no incluyen el costo de los surtidos (se muestra por separado en "Deuda de Surtido")
- Todo queda guardado en el dispositivo — no se borra al cerrar la app
