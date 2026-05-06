'use client';

import React, { useState } from 'react';
import { Card, SectionHeader, Badge } from '@/presentation/components/ui';

const sections = [
  { id: 'company', label: '🏢 Empresa', desc: 'Datos de la empresa y configuración general' },
  { id: 'notifications', label: '🔔 Notificaciones', desc: 'Alertas de email, WhatsApp y sistema' },
  { id: 'integrations', label: '🔗 Integraciones', desc: 'Firebase, Stripe, correo SMTP' },
  { id: 'qr', label: '▦ Códigos QR', desc: 'Generación e impresión de QRs de activos' },
];

export default function SettingsPage() {
  const [active, setActive] = useState('company');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-desc">Parámetros del sistema, integraciones y preferencias</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`nav-item ${active === s.id ? 'active' : ''}`}
              style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px', height: 'auto' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.label}</span>
              <span className="text-xs text-muted" style={{ marginTop: '2px' }}>{s.desc}</span>
            </button>
          ))}
        </div>

        <Card>
          {active === 'company' && (
            <>
              <SectionHeader title="Datos de la Empresa" subtitle="Información que aparece en facturas y reportes" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Nombre Empresa', placeholder: 'MantOS SpA', value: 'MantOS SpA' },
                  { label: 'RUT Empresa', placeholder: '76.123.456-7', value: '76.123.456-7' },
                  { label: 'Email Contacto', placeholder: 'contacto@mantos.cl', value: 'admin@mantos.cl' },
                  { label: 'Teléfono', placeholder: '+56 2 1234 5678', value: '+56 2 2345 6789' },
                  { label: 'Dirección', placeholder: 'Av. Providencia 123', value: 'Av. Providencia 1234, Santiago' },
                  { label: 'Ciudad', placeholder: 'Santiago', value: 'Santiago' },
                ].map(f => (
                  <div key={f.label} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input type="text" className="form-input" defaultValue={f.value} placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary">💾 Guardar Cambios</button>
                <button className="btn btn-secondary">↩ Cancelar</button>
              </div>
            </>
          )}

          {active === 'notifications' && (
            <>
              <SectionHeader title="Configuración de Notificaciones" subtitle="Define cuándo y cómo recibir alertas" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'OT completada', desc: 'Notificar cuando un técnico cierra una OT', enabled: true },
                  { label: 'Stock bajo', desc: 'Alerta cuando un ítem llega al mínimo', enabled: true },
                  { label: 'Factura vencida', desc: 'Recordatorio de cobros pendientes', enabled: true },
                  { label: 'Cotización sin respuesta', desc: 'Alerta de cotizaciones enviadas hace +7 días', enabled: false },
                  { label: 'Mantención próxima', desc: 'Recordatorio de mantenimientos programados', enabled: true },
                  { label: 'Informe diario', desc: 'Resumen diario de operaciones por email', enabled: false },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{n.label}</div>
                      <div className="text-xs text-secondary" style={{ marginTop: '2px' }}>{n.desc}</div>
                    </div>
                    <Badge color={n.enabled ? 'green' : 'gray'} dot>{n.enabled ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {active === 'integrations' && (
            <>
              <SectionHeader title="Integraciones" subtitle="Conexiones con servicios externos" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Firebase / Firestore', status: 'connected', desc: 'Base de datos y autenticación' },
                  { name: 'Firebase Storage', status: 'connected', desc: 'Almacenamiento de fotos e imágenes' },
                  { name: 'SMTP Email', status: 'disconnected', desc: 'Envío de correos y notificaciones' },
                  { name: 'Stripe Payments', status: 'disconnected', desc: 'Pasarela de pagos en línea' },
                ].map(i => (
                  <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{i.name}</div>
                      <div className="text-xs text-secondary">{i.desc}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <Badge color={i.status === 'connected' ? 'green' : 'gray'} dot>
                        {i.status === 'connected' ? 'Conectado' : 'No configurado'}
                      </Badge>
                      <button className="btn btn-secondary btn-sm">⚙️ Config</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {active === 'qr' && (
            <>
              <SectionHeader title="Gestión de Códigos QR" subtitle="Generación e impresión para activos de clientes" />
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '60px', marginBottom: '16px' }}>▦</div>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Generador de QR por Activo</div>
                <div className="text-sm text-secondary" style={{ marginBottom: '24px' }}>
                  Selecciona un cliente y activo desde el módulo de Clientes para generar su código QR físico.
                  El técnico escanea el QR para iniciar la OT automáticamente.
                </div>
                <button className="btn btn-primary">🏢 Ir a Clientes y Activos</button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
