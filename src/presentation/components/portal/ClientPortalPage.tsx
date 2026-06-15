'use client';

/**
 * ClientPortalPage — Portal del cliente final (mobile-first).
 *
 * El cliente ingresa con su código (CLI-XXXXXXXX, impreso en su contrato o
 * código QR). Se guarda en localStorage para no volver a pedirlo.
 * Muestra: datos, activos, historial, próximas visitas, estado de cuenta y
 * formulario de solicitud de servicio.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, SectionHeader, Badge, EmptyState,
} from '@/presentation/components/ui';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { getSession, clearSession } from '@/infrastructure/auth/RoleContext';
import { GetClientPortalDataUseCase, ClientPortalData } from '@/use-cases/portal/GetClientPortalDataUseCase';
import { CreateServiceRequestUseCase } from '@/use-cases/portal/CreateServiceRequestUseCase';
import { ServiceRequestStatus } from '@/core/domain/ServiceRequest';

// ─── Use cases instanciados a nivel de módulo (DIP) ──────────────────────────
const getPortalDataUC = new GetClientPortalDataUseCase(
  repositories.clients,
  repositories.assets,
  repositories.maintenance,
  repositories.invoices,
  repositories.serviceRequests,
);
const createServiceRequestUC = new CreateServiceRequestUseCase(repositories.serviceRequests);

// ─── Constantes / helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'mantos.portal.clientId';
const CLIENT_ID_REGEX = /^CLI-[0-9A-Z]{4,12}$/;

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const ASSET_ICONS: Record<string, string> = {
  piscina: '🏊', hvac: '❄️', motor: '⚙️', tablero: '⚡',
  seguridad_electronica: '📹', incendio: '🔥', bomba: '💧',
  generador: '🔋', ascensor: '🛗', otro: '📦',
};

const REQUEST_STATUS: Record<ServiceRequestStatus, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'cyan' }> = {
  new: { label: 'Recibida', color: 'cyan' },
  in_review: { label: 'En revisión', color: 'blue' },
  scheduled: { label: 'Agendada', color: 'green' },
  rejected: { label: 'Rechazada', color: 'red' },
  closed: { label: 'Cerrada', color: 'gray' },
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Pantalla de acceso (código de cliente) ──────────────────────────────────
function AccessGate({ onSubmit, error, loading }: {
  onSubmit: (code: string) => void;
  error: string | null;
  loading: boolean;
}) {
  const [code, setCode] = useState('');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', padding: '24px 16px',
    }}>
      <Card style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔑</div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Bienvenido a tu Portal</h1>
        <p className="text-sm text-secondary" style={{ marginBottom: '20px' }}>
          Ingresa tu código de cliente (lo encuentras en tu contrato, boleta o código QR).
        </p>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(code.trim().toUpperCase()); }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <input
            className="input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="CLI-XXXXXXXX"
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            style={{
              width: '100%', padding: '12px 14px', fontSize: '16px',
              fontFamily: 'monospace', textAlign: 'center', letterSpacing: '1px',
              background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            }}
          />
          {error && (
            <div style={{ fontSize: '13px', color: 'var(--danger-500)' }}>{error}</div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ─── Formulario de solicitud de servicio ─────────────────────────────────────
function ServiceRequestForm({ data, onCreated }: { data: ClientPortalData; onCreated: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [phone, setPhone] = useState(data.client.contactPhone || '');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: '15px',
    background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!subject.trim() || !description.trim()) {
      setFeedback({ ok: false, msg: 'Completa el asunto y la descripción.' });
      return;
    }
    setSending(true);
    try {
      const asset = data.assets.find(a => a.id === assetId);
      await createServiceRequestUC.execute({
        clientId: data.client.id,
        clientName: data.client.businessName,
        assetId: asset?.id,
        assetName: asset?.name,
        subject,
        description,
        contactPhone: phone || undefined,
      });
      setSubject(''); setDescription(''); setAssetId('');
      setFeedback({ ok: true, msg: 'Solicitud enviada. Te contactaremos a la brevedad.' });
      onCreated();
    } catch (err) {
      console.error('Error creando solicitud de servicio:', err);
      setFeedback({ ok: false, msg: 'No se pudo enviar la solicitud. Intenta nuevamente.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        style={inputStyle}
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Asunto (ej: Agua turbia en piscina)"
        maxLength={80}
      />
      {data.assets.length > 0 && (
        <select style={inputStyle} value={assetId} onChange={e => setAssetId(e.target.value)}>
          <option value="">Equipo relacionado (opcional)</option>
          {data.assets.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}
      <textarea
        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Describe lo que necesitas..."
        maxLength={600}
      />
      <input
        style={inputStyle}
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Teléfono de contacto"
        inputMode="tel"
      />
      {feedback && (
        <div style={{ fontSize: '13px', color: feedback.ok ? 'var(--success-500)' : 'var(--danger-500)' }}>
          {feedback.msg}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%' }}>
        {sending ? 'Enviando...' : '📨 Enviar solicitud'}
      </button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ClientPortalPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [data, setData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);

  const loadData = useCallback(async (id: string) => {
    setLoading(true);
    setGateError(null);
    try {
      const result = await getPortalDataUC.execute(id);
      if (!result) {
        setGateError('Código no encontrado. Verifica e intenta nuevamente.');
        setClientId(null);
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setData(result);
      setClientId(id);
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch (err) {
      console.error('Error cargando portal cliente:', err);
      setGateError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Prioridad 1: sesión de RoleContext (viene del login unificado)
  // Prioridad 2: sesión propia del portal en localStorage
  useEffect(() => {
    const roleSession = getSession();
    if (roleSession?.role === 'client' && roleSession.userId) {
      loadData(roleSession.userId);
      return;
    }
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored && CLIENT_ID_REGEX.test(stored)) {
      loadData(stored);
    } else {
      setLoading(false);
    }
  }, [loadData]);

  const handleGateSubmit = (code: string) => {
    if (!CLIENT_ID_REGEX.test(code)) {
      setGateError('Formato inválido. Debe ser CLI-XXXXXXXX.');
      return;
    }
    loadData(code);
  };

  const handleLogout = () => {
    clearSession();
    window.localStorage.removeItem(STORAGE_KEY);
    setClientId(null);
    setData(null);
    router.replace('/login');
  };

  // ── Estados de carga / acceso ──────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div style={{ padding: '16px', maxWidth: '640px', margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: '110px', background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)', marginBottom: '12px', opacity: 1 - i * 0.2,
          }} />
        ))}
      </div>
    );
  }

  if (!clientId || !data) {
    return <AccessGate onSubmit={handleGateSubmit} error={gateError} loading={loading} />;
  }

  const { client, assets, history, upcomingVisits, openInvoices, totalDue, serviceRequests } = data;

  return (
    <div className="animate-fade-in" style={{ padding: '16px', maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Datos del cliente */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: 700 }}>{client.businessName}</div>
            <div className="text-sm text-secondary" style={{ marginTop: '4px' }}>
              {client.address}{client.commune ? `, ${client.commune}` : ''}
            </div>
            <div className="text-xs text-muted font-mono" style={{ marginTop: '6px' }}>{client.id}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
            Salir
          </button>
        </div>
      </Card>

      {/* Próximas visitas */}
      <Card>
        <SectionHeader title="Próximas Visitas" subtitle="Mantenciones programadas" />
        {upcomingVisits.length === 0 ? (
          <EmptyState icon="📅" title="Sin visitas programadas" description="Cuando se agende tu próxima mantención, aparecerá aquí." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingVisits.slice(0, 5).map(v => (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
              }}>
                <span style={{ fontSize: '20px' }}>📅</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{v.assetName || 'Mantención programada'}</div>
                  <div className="text-xs text-secondary">{fmtDate(v.scheduledDate)}{v.technicianName ? ` · ${v.technicianName}` : ''}</div>
                </div>
                <Badge color="yellow">Agendada</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Mis equipos */}
      <Card>
        <SectionHeader title="Mis Equipos" subtitle={`${assets.length} activo${assets.length === 1 ? '' : 's'} en mantención`} />
        {assets.length === 0 ? (
          <EmptyState icon="📦" title="Sin equipos registrados" description="Tu empresa mantenedora aún no ha registrado tus equipos." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {assets.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
              }}>
                <span style={{ fontSize: '20px' }}>{ASSET_ICONS[a.type] || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{a.name}</div>
                  <div className="text-xs text-secondary">
                    Mantención cada {a.maintenanceFrequencyDays} días
                  </div>
                </div>
                <Badge color={a.status === 'active' ? 'green' : 'gray'}>
                  {a.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Historial de mantenimientos */}
      <Card>
        <SectionHeader title="Historial de Servicios" subtitle="Mantenciones realizadas" />
        {history.length === 0 ? (
          <EmptyState icon="🧾" title="Sin servicios aún" description="Aquí verás el detalle de cada mantención realizada." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.slice(0, 10).map(h => (
              <div key={h.id} style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {h.assetName || 'Mantención'} · {fmtDate(h.completedAt || h.scheduledDate)}
                  </div>
                  <div className="font-semibold" style={{ fontSize: '13px' }}>{CLP.format(h.totalCost || 0)}</div>
                </div>
                <div className="text-xs text-secondary" style={{ marginTop: '2px' }}>
                  Técnico: {h.technicianName || '—'}
                </div>
                {h.observations && (
                  <div className="text-xs text-secondary" style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    “{h.observations}”
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Estado de cuenta */}
      <Card>
        <SectionHeader title="Estado de Cuenta" subtitle="Facturas con saldo pendiente" />
        {openInvoices.length === 0 ? (
          <EmptyState icon="✅" title="Estás al día" description="No tienes facturas con saldo pendiente." />
        ) : (
          <>
            <div style={{
              padding: '12px', marginBottom: '10px', textAlign: 'center',
              background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
            }}>
              <div className="text-xs text-secondary">Saldo total pendiente</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--warning-500)' }}>{CLP.format(totalDue)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {openInvoices.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                }}>
                  <span style={{ fontSize: '20px' }}>🧾</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600 }}>{inv.invoiceNumber}</div>
                    <div className="text-xs text-secondary">Vence: {fmtDate(inv.dueDate)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-semibold" style={{ fontSize: '13px' }}>{CLP.format(inv.pendingAmount)}</div>
                    <Badge color={inv.status === 'overdue' ? 'red' : inv.status === 'partial' ? 'yellow' : 'blue'}>
                      {inv.status === 'overdue' ? 'Vencida' : inv.status === 'partial' ? 'Abonada' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Placeholder pasarela de pagos */}
        <div style={{
          marginTop: '12px', padding: '12px', textAlign: 'center',
          border: '1px dashed var(--bg-border)', borderRadius: 'var(--radius-sm)',
          fontSize: '13px', color: 'var(--text-secondary)',
        }}>
          💳 Pasarela de pagos: próximamente
        </div>
      </Card>

      {/* Solicitar servicio */}
      <Card>
        <SectionHeader title="Solicitar Servicio" subtitle="¿Necesitas una visita o reparación?" />
        <ServiceRequestForm data={data} onCreated={() => loadData(client.id)} />
        {serviceRequests.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div className="text-xs text-secondary" style={{ marginBottom: '8px', fontWeight: 600 }}>Mis solicitudes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {serviceRequests.slice(0, 5).map(sr => (
                <div key={sr.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                  background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sr.subject}</div>
                    <div className="text-xs text-secondary">{fmtDate(sr.createdAt)}</div>
                  </div>
                  <Badge color={REQUEST_STATUS[sr.status].color}>{REQUEST_STATUS[sr.status].label}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="text-xs text-muted" style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        Portal Cliente · MantOS
      </div>
    </div>
  );
}
