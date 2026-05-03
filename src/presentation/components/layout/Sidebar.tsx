'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
      { href: '/maintenance', label: 'Mantenimientos', icon: '🔧', badge: 3 },
      { href: '/logistics', label: 'Logística', icon: '🗺️' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/clients', label: 'Clientes y Activos', icon: '🏢' },
      { href: '/inventory', label: 'Inventario', icon: '📦' },
      { href: '/quotes', label: 'Cotizaciones', icon: '📋' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/finances', label: 'Finanzas', icon: '💰' },
      { href: '/billing', label: 'Cobros', icon: '💳' },
      { href: '/reports', label: 'Estadísticas', icon: '📊' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/team', label: 'Equipo', icon: '👥' },
      { href: '/vehicles', label: 'Vehículos', icon: '🚐' },
      { href: '/settings', label: 'Configuración', icon: '⚙️' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Link href="/dashboard" className="logo-mark">
          <div className="logo-icon">⚡</div>
          <div>
            <div className="logo-text">MantOS</div>
            <div className="logo-sub">Plataforma SaaS</div>
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${isActive ? ' active' : ''}`}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--bg-border)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(6,182,212,0.05))',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand-400)', marginBottom: '4px' }}>
            Plan Profesional
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            300/500 clientes activos
          </div>
          <div style={{
            height: '4px',
            background: 'var(--bg-border)',
            borderRadius: '100px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '60%',
              background: 'var(--gradient-brand)',
              borderRadius: '100px',
            }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
