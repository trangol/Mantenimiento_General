# MantOS — Flujo Operacional End-to-End

**Versión:** 1.1 · **Fecha:** Junio 2026

Este documento describe el flujo completo de gestión de servicios en MantOS, desde la planificación hasta la validación del pago. Cada paso está implementado en la plataforma y puede navegarse desde el menú lateral.

---

## Diagrama del flujo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PASO 1         PASO 2          PASO 3          PASO 4         PASO 5       │
│                                                                              │
│  📆              🔧              📋              💳             ✅           │
│  Planificación → Mantenimientos → Preparación → Cobros → Validación         │
│  /logistics      /maintenance    /billing/      /billing/      /billing/    │
│                                 prepare        charge         validate      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Paso 1 — Planificación `/logistics`

**Quién:** Coordinador / Administrador  
**Cuándo:** Con anticipación (semanal o mensual)

### Qué se hace aquí

- **Tab Planificación:** Vista de calendario (semana o 4 semanas) que muestra las visitas programadas según las frecuencias activas de cada cliente. Permite ver la carga de trabajo por técnico y vehículo antes de que ocurra.
- **Tab Rutas Diarias:** El día de trabajo, se genera la ruta automáticamente desde las frecuencias (botón "Generar desde frecuencias") o se crea manualmente. Cada ruta tiene un vehículo, conductor y lista de paradas en orden.
- **Tab Frecuencias:** Configuración base: qué cliente, qué días de la semana, qué técnico, qué vehículo, duración estimada.

### Entidades involucradas

- `RecurringSchedule` — Frecuencia de visita por cliente
- `Route` — Ruta del día con paradas ordenadas
- `RouteStop` — Parada individual con estado (pendiente → en curso → completada)

### Cómo avanza al siguiente paso

Las rutas generadas crean `MaintenanceRecord` en estado `pending` cuando el técnico escanea el QR de entrada en terreno.

---

## Paso 2 — Mantenimientos `/maintenance`

**Quién:** Técnico en terreno (vía `/scan`) + Supervisor (vía `/maintenance`)  
**Cuándo:** El día de trabajo

### Flujo del técnico en terreno

1. **Llegada:** Escanea el QR físico del activo del cliente → sistema registra `startedAt`
2. **Protocolo:** Completa el checklist de pasos obligatorios (medir pH, limpiar filtros, revisar bomba, etc.). Los pasos marcados como `required: true` bloquean el cierre si no están completados.
3. **Fotos:** Toma fotografías iniciales y finales del estado del activo
4. **Insumos:** Registra los insumos utilizados (descuenta del inventario automáticamente)
5. **Tarifa:** Puede agregar una tarifa de servicio adicional a los insumos
6. **Cierre:** Escanea el QR de salida → sistema registra `completedAt` y calcula `totalCost`

### Estados del `MaintenanceRecord`

```
pending → in_progress → completed → (facturado vía preparación)
                    ↘ cancelled
```

### Estado de cobro (`billingStatus`)

```
unbilled → in_preparation → billed → paid
```

- `unbilled`: Completado pero aún no incluido en ninguna factura
- `in_preparation`: Incluido en un borrador de factura
- `billed`: Factura emitida (enviada al cliente)
- `paid`: Factura pagada y conciliada

### Vista del supervisor (`/maintenance`)

- Tabla en tiempo real de todas las OTs con filtros por estado y estado de cobro
- Columna de protocolo con barra de progreso: cuántos pasos completados vs. requeridos
- Columna de tarifa editable directamente
- Columna de tiempo (duración = `completedAt - startedAt`)

---

## Paso 3 — Preparación de Cobros `/billing/prepare`

**Quién:** Administrador / Coordinador de cobros  
**Cuándo:** Al cierre del período acordado con el cliente

### Qué se hace aquí

1. **Seleccionar período:** Elige el tipo (puntual, semanal, mensual, trimestral, etc.) y la fecha de corte
2. **Buscar servicios:** El sistema carga todos los `MaintenanceRecord` completados en ese período con `billingStatus = unbilled`
3. **Revisar por cliente:** Los servicios se agrupan por cliente con subtotal, IVA y total
4. **Ajuste manual:** Es posible excluir ítems individuales con un checkbox antes de generar
5. **Generar factura borrador:** Al hacer clic en "Generar cobro" para un cliente (o "Generar todas"), se crea un `Invoice` en estado `draft` y se actualiza el `billingStatus` de las OTs a `in_preparation`

### Períodos disponibles

| Tipo | Días cubiertos |
|------|---------------|
| Puntual (día) | 1 |
| Semanal | 7 |
| Quincenal | 14 |
| Mensual | 30 |
| Bimensual | 60 |
| Trimestral | 90 |
| Semestral | 180 |
| Anual | 365 |
| Bianual | 730 |

---

## Paso 4 — Cobros `/billing/charge`

**Quién:** Administrador  
**Cuándo:** Inmediatamente después de la preparación o cuando el borrador esté listo para emitir

### Qué se hace aquí

1. **Revisar el borrador (`draft`):** Ver los servicios incluidos, montos y totales con IVA
2. **Emitir (`draft → pending`):** El botón "Emitir cobro" cambia el estado a `pending` (la factura es oficial)
3. **Enviar al cliente:**
   - 📧 **Email:** Marca la factura como enviada por correo (integración real requiere backend SMTP/SendGrid — pendiente)
   - 🔗 **Link web:** Genera un token público único, copia el link al portal del cliente donde puede ver el detalle
   - 💬 **WhatsApp:** Abre la app de WhatsApp con un mensaje pre-armado incluyendo el link
4. **Registrar pagos manuales:** Desde la misma pantalla se puede registrar pagos (transferencia, efectivo, tarjeta, cheque) con referencia

### Estados de factura

```
draft → pending → partial → paid
             ↘ overdue (automático si vence sin pago total)
```

### Link público del cliente

Cada factura tiene un `publicToken` único que permite al cliente ver el detalle en:
```
https://[dominio]/portal/invoice/[TOKEN]
```
No requiere login. Muestra: servicios, fechas, técnico, montos, estado de pago.

---

## Paso 5 — Validación de Pagos `/billing/validate`

**Quién:** Administrador / Contador  
**Cuándo:** Periódicamente al recibir el extracto bancario

### Qué se hace aquí

1. **Subir Excel del banco:** Exporta el informe de abonos/transferencias desde el banco y súbelo. El sistema acepta `.xlsx`, `.xls` y `.csv`.
2. **Cotejo automático:** El sistema compara las filas del banco con las facturas pendientes usando dos criterios:
   - **Por referencia:** Busca el número de factura (FAC-XXXX) o nombre del cliente en la glosa/descripción
   - **Por monto:** Diferencia < 5% entre el monto del banco y el saldo pendiente
3. **Tabla de revisión:**
   - ✅ **Coincide:** Monto y referencia cuadran → puede confirmar directamente
   - ⚠️ **Parcial:** Monto con diferencia >5% o sin referencia clara → revisar manualmente
   - ❌ **Sin coincidencia:** No se encontró registro bancario para la factura
4. **Confirmar conciliación:** Al confirmar, el sistema registra el pago automáticamente y marca la factura como `reconciled: true`

### Formato del Excel bancario

El archivo debe tener estas columnas (nombres aproximados, case-insensitive):

| Columna buscada | Nombres aceptados |
|-----------------|------------------|
| Fecha | fecha, date, dia |
| Monto | monto, amount, valor, importe, abono, crédito |
| Referencia | referencia, ref, numero, folio |
| Glosa | glosa, descripcion, detalle, concepto |
| RUT cliente | rut, cliente |

### Alertas de vencimiento

La pantalla muestra automáticamente las facturas vencidas con el número de días transcurridos desde el vencimiento, para facilitar el seguimiento de cobranza.

---

## Resumen de estados y transiciones

### `MaintenanceRecord.status`
```
pending ──────────────→ in_progress ──────────→ completed
   └──────────────────────────────────────────→ cancelled
```

### `MaintenanceRecord.billingStatus`
```
unbilled → in_preparation → billed → paid
```

### `Invoice.status`
```
draft → pending ─────────→ paid
           └──→ partial ──→ paid
           └──→ overdue (automático por fecha)
           └──→ cancelled
```

---

## Accesos directos del menú

| Sección | Ruta | Descripción |
|---------|------|-------------|
| Planificación | `/logistics` → tab Planificación | Vista de calendario con frecuencias |
| Rutas diarias | `/logistics` → tab Rutas Diarias | Estado de rutas del día |
| Frecuencias | `/logistics` → tab Frecuencias | Configuración de recurrencia |
| Mantenimientos | `/maintenance` | OTs en tiempo real |
| Preparación | `/billing/prepare` | Agrupar servicios por período |
| Cobros | `/billing/charge` | Facturas, emisión y pagos |
| Validar pagos | `/billing/validate` | Conciliación con Excel bancario |
| Finanzas | `/finances` | Resumen mensual y KPIs |
| Estadísticas | `/reports` | Rendimiento por técnico, cliente, período |

---

## Flujo para el caso del cliente piscinas (ejemplo real)

1. **Lunes:** El coordinador revisa en `/logistics → Planificación` que los 8 vehículos tienen sus rutas armadas para la semana (40 clientes por vehículo aprox.)
2. **Cada día:** Los vehículos salen, los técnicos escanean QR en cada piscina, completan el checklist de 7 pasos, registran insumos (cloro, floculante, etc.) y escanean QR de salida
3. **Fin de mes:** El administrador va a `/billing/prepare`, selecciona período mensual, revisa los servicios agrupados por cliente (aprox. 4-8 visitas por cliente), ajusta si hay excepciones, y genera las ~300 facturas borrador
4. **Emisión:** Desde `/billing/charge` emite las facturas y envía el link por WhatsApp a cada cliente
5. **Conciliación:** Al recibir el extracto bancario, sube el Excel a `/billing/validate`, el sistema coteja automáticamente, confirma las que cuadran y registra los pagos

---

## Pendiente (próximas fases)

- [ ] Envío real de emails con PDF adjunto (requiere integración SendGrid/Resend)
- [ ] Pasarela de pagos online (Transbank/Khipu) en portal cliente
- [ ] Autenticación Firebase Auth con roles (técnico, coordinador, admin)
- [ ] Generación de PDF del informe de cobro desde el sistema
- [ ] Notificaciones automáticas de vencimiento por WhatsApp/email
