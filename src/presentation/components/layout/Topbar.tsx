'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import { SyncStatusBadge } from './SyncStatusBadge';
import { getSession, clearSession } from '@/infrastructure/auth/RoleContext';

// Mapa de rutas a títulos legibles
const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':   { title: 'Dashboard',         subtitle: 'Vista general de operaciones' },
  '/maintenance': { title: 'Mantenimientos',    subtitle: 'Órdenes de trabajo en curso' },
  '/logistics':   { title: 'Logística y Rutas', subtitle: 'Flota y despliegue diario' },
  '/clients':     { title: 'Clientes y Activos',subtitle: 'Cartera de clientes activos' },
  '/inventory':   { title: 'Inventario',         subtitle: 'Stock en bodega y vehículos' },
  '/quotes':      { title: 'Cotizaciones',        subtitle: 'Propuestas y seguimiento' },
  '/finances':    { title: 'Finanzas',            subtitle: 'Ingresos y cobros' },
  '/billing':     { title: 'Cobros',              subtitle: 'Gestión de pagos' },
  '/reports':     { title: 'Estadísticas',        subtitle: 'KPIs y rendimiento' },
  '/team':        { title: 'Equipo',              subtitle: 'Personal y técnicos' },
  '/vehicles':    { title: 'Vehículos',           subtitle: 'Flota de la empresa' },
  '/settings':    { title: 'Configuración',       subtitle: 'Ajustes del sistema' },
};

export function Topbar() {
  const { toggle } = useSidebar();
  const pathname  = usePathname();
  const router    = useRouter();
  const session   = getSession();

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const route = routeTitles[pathname] ?? { title: 'MantOS', subtitle: 'Panel Administrador' };
  const initials = session?.userName
    ? session.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <header className="topbar">
      {/* Hamburger — visible solo en mobile */}
      <button
        className="topbar-menu-btn"
        onClick={toggle}
        aria-label="Abrir menú"
      >
        <span className="hamburger-icon">
          <span /><span /><span />
        </span>
      </button>

      {/* Título de página (oculto en mobile muy pequeño) */}
      <div className="topbar-title" style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {route.title}
        </div>
        <div className="topbar-subtitle" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {route.subtitle}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Estado de sincronización offline-first */}
        <SyncStatusBadge />

        {/* Notificaciones */}
        <button className="btn btn-ghost btn-icon" title="Notificaciones" style={{ position: 'relative' }}>
          <span style={{ fontSize: '18px' }}>🔔</span>
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '8px', height: '8px',
            background: 'var(--danger-500)',
            borderRadius: '50%',
            border: '2px solid var(--bg-surface)',
          }} />
        </button>

        {/* Separador */}
        <div className="topbar-divider" style={{ width: '1px', height: '28px', background: 'var(--bg-border)' }} />

        {/* Avatar de usuario + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="avatar" style={{ fontSize: '14px' }}>{initials}</div>
          <div className="topbar-user-info">
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {session?.userName ?? 'Admin'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Administrador</div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: 'none', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)',
              padding: '4px 8px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)',
              marginLeft: '4px',
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
