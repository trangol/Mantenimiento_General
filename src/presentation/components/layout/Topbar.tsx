'use client';

import React from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="topbar">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <div style={{ width: '1px', height: '28px', background: 'var(--bg-border)' }} />

        {/* Avatar de usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div className="avatar" style={{ fontSize: '14px' }}>AD</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Admin
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              admin@mantos.cl
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
