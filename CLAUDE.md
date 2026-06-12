# MantOS — Guía de desarrollo (leer antes de tocar código)

Plataforma SaaS multi-tenant de gestión de mantenimientos para el mercado chileno
(piscinas, HVAC, seguridad electrónica, incendio, sistemas generales).
Primer cliente: empresa de mantención de piscinas (300 clientes, 8 vehículos).

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Firebase/Firestore · Tailwind v4 · lucide-react · qrcode

## Arquitectura — Clean Architecture / SOLID (OBLIGATORIO)

```
src/
  core/domain/          Entidades puras (sin imports de Firebase ni React)
  core/repositories/    Interfaces I*Repository (contratos)
  infrastructure/
    firebase/           Implementaciones Firestore + RepositoryFactory + tenantScope
    tenant/             TenantContext (tenant activo)
    sync/               SyncService (estado offline/sincronización)
  use-cases/            Lógica de negocio; reciben interfaces por constructor (DIP)
  presentation/         Componentes React; SOLO presentan, no contienen reglas de negocio
  app/                  Rutas Next: (admin), (client) portal, (survey), (tech)
```

Reglas:
- El dominio nunca importa Firebase. Los use cases dependen de interfaces, no de Firestore (DIP).
- Use cases se instancian a nivel de módulo (fuera del componente).
- Acceso a datos SOLO vía `repositories` (singleton de `@/infrastructure/firebase/RepositoryFactory`).
- Nuevo repositorio = interfaz en core/repositories + impl Firestore + getter en RepositoryFactory.

## Multi-tenancy (CRÍTICO — aislamiento de datos por empresa)

- Toda entidad persistida lleva `tenantId` (formato `TEN-XXXXXXXX`).
- Helpers obligatorios en `@/infrastructure/firebase/tenantScope`:
  - `tenantWhere()` → primer constraint de TODA query de colección.
  - `stampTenant(data)` → en TODO create.
  - `belongsToTenant(data)` → validar en todo getById (devolver null si no pertenece).
  - `stripUndefined(data)` → Firestore rechaza undefined (¡también dentro de arrays/objetos anidados!).
- Tenant activo: `getCurrentTenantId()` de `@/infrastructure/tenant/TenantContext`
  (localStorage `mantos.tenantId` → env `NEXT_PUBLIC_DEFAULT_TENANT_ID` → `TEN-SIELCO01`).
- NUNCA hardcodear tenantId en UI ni use cases.
- Migración de datos legados sin tenantId: botón en /settings ("Asignar tenant a datos legados")
  → `src/infrastructure/firebase/migrations/addTenantIdMigration.ts`.
- Cuando exista Firebase Auth: tenantId vendrá del custom claim del token; solo cambia TenantContext.

## Offline-first

- `firebaseConfig.ts` usa `persistentLocalCache` + `persistentMultipleTabManager`:
  lecturas servidas de caché IndexedDB y escrituras ENCOLADAS sin red; Firestore
  vuelca la cola automáticamente al reconectar. No implementar colas manuales.
- Estado para UI: `useSyncStatus()` de `@/infrastructure/sync/SyncService`;
  badge visible en Topbar (`SyncStatusBadge`).
- Antes de operaciones que requieren confirmación de servidor: `waitForSync()`.
- LIMITACIÓN: `getCountFromServer` y transacciones NO funcionan offline; evitarlas
  en flujos de terreno (técnicos con celular sin señal).

## Seguridad y base de datos

- `firestore.rules`: aislamiento por tenant. HOY está en `devMode() = true`
  (sin auth aún). ANTES DE PRODUCCIÓN: poner `devMode()` en false y
  `firebase deploy --only firestore:rules`.
- `firestore.indexes.json`: índices compuestos (tenantId + orderBy). Desplegar con
  `firebase deploy --only firestore:indexes`. Si una query nueva pide índice,
  Firestore muestra link de creación en consola del navegador — agregar también al JSON.
- `stock_movements` es inmutable (auditoría): nunca update/delete.
- Correlativos COT-/FAC- son por tenant (`getNextNumber()` usa count + tenantWhere).

## Paginación

- SIEMPRE cursor-based (`startAfter` + `limit`), nunca offset. Tipos en
  `@/core/domain/Pagination.ts` (`Page<T>`, `PageRequest`, máx 100/página).
- Implementada en clients y maintenance_records (`getPage`). Replicar el patrón
  pageSize+1 → hasMore/nextCursor en nuevas listas grandes.

## UI / Presentación

- Componentes compartidos: `@/presentation/components/ui` (Card, Badge, StatCard,
  EmptyState, SectionHeader…).
- **BadgeColor válidos SOLO: blue, green, yellow, red, gray, cyan** (purple rompe el build).
- Estilos con CSS variables del design system (--brand-*, --bg-*, --text-*, --radius-*).
- Mobile-first: técnicos y clientes finales usan celular.
- Moneda: CLP formato $1.234.567 (`Intl.NumberFormat('es-CL')`). IVA 19%.
- Comentarios y textos de UI en español (Chile).

## IDs del sistema

| Entidad | Formato |
|---|---|
| Tenant (empresa) | TEN-XXXXXXXX |
| Cliente | CLI-XXXXXXXX |
| Activo | AST-XXXXXXXX |
| QR físico | QR-XXXXXXXXXXXX |
| Cotización | COT-0001 (por tenant) |
| Factura/cobro | FAC-0001 (por tenant) |

## Flujo de trabajo / deploy

- NO usar entornos locales: se trabaja contra producción Vercel
  (https://mantenimiento-general.vercel.app). Deploy = commit + push a main
  (repo https://github.com/trangol/Mantenimiento_General).
- Antes de cada push: `npx tsc --noEmit` y `npm run build` limpios.
- `temp-app/` es legacy, excluida de tsconfig — no tocar.

## Estado de módulos (actualizar al avanzar)

| Módulo | Estado |
|---|---|
| Levantamiento terreno (/levantamiento) | ✅ |
| Clientes y activos (/clients) | ✅ |
| Mantenimientos + QR (/maintenance, /scan) | ✅ |
| Logística y rutas (/logistics) | ✅ |
| Inventario (/inventory) | ✅ |
| Cotizaciones (/quotes) — descuenta stock al aceptar | ✅ |
| Finanzas y cobros (/finances) — pagos manuales | ✅ (pasarela pendiente) |
| Dashboard KPIs (/dashboard) | ✅ |
| Portal cliente (/portal) — acceso por código CLI | ✅ base (pagos online pendientes) |
| Autenticación (Firebase Auth + claims tenant) | ⏳ pendiente |
| Pasarela de pagos (Transbank/Khipu) | ⏳ pendiente |
| Envío PDF por correo | ⏳ pendiente |
