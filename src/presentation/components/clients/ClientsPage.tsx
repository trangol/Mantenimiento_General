'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, SectionHeader, Badge, EmptyState,
} from '@/presentation/components/ui';
import { GetClientWithAssetsUseCase, ClientWithAssets } from '@/use-cases/clients/GetClientWithAssetsUseCase';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { Client, ServiceType } from '@/core/domain/Client';
import { Asset } from '@/core/domain/Asset';

// ─── Use cases instanciados (DIP) ───────────────────────────────────────────
const getClientWithAssetsUC = new GetClientWithAssetsUseCase(
  repositories.clients,
  repositories.assets
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  piscinas: '🏊', hvac: '❄️', seguridad_electronica: '📹',
  incendio: '🔥', motores: '⚙️', tableros: '⚡', general: '🔧', otro: '📦',
};

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  piscinas: 'Piscinas', hvac: 'HVAC', seguridad_electronica: 'Seguridad',
  incendio: 'Incendio', motores: 'Motores', tableros: 'Tableros', general: 'General', otro: 'Otro',
};

const ASSET_TYPE_ICONS: Record<string, string> = {
  piscina: '🏊', hvac: '❄️', motor: '⚙️', tablero: '⚡',
  seguridad_electronica: '📹', incendio: '🔥', bomba: '💧',
  generador: '🔋', ascensor: '🛗', otro: '📦',
};

const FREQ_LABEL = (days: number) => {
  if (days <= 7) return 'Semanal';
  if (days <= 15) return 'Quincenal';
  if (days <= 31) return 'Mensual';
  if (days <= 92) return 'Trimestral';
  return `Cada ${days} días`;
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: '16px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          height: '52px', background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-sm)', marginBottom: '8px',
          opacity: 1 - i * 0.1,
        }} />
      ))}
    </div>
  );
}

// ─── Modal QR ────────────────────────────────────────────────────────────────
function QrModal({ asset, clientName, onClose }: { asset: Asset; clientName: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    import('qrcode').then(QRCode => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      QRCode.toCanvas(canvas, asset.qrCodeId, {
        width: 220, margin: 2,
        color: { dark: '#1e3a8a', light: '#ffffff' },
      }, (err: Error | null | undefined) => { if (!err) setQrReady(true); });
    }).catch(() => setQrReady(true));
  }, [asset.qrCodeId]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${asset.qrCodeId}-${asset.name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [asset]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} className="animate-fade-in" style={{
        background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
        borderRadius: 'var(--radius-xl)', padding: '24px',
        maxWidth: '340px', width: '100%', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{asset.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{clientName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{
          background: 'white', display: 'inline-block',
          padding: '16px', borderRadius: 'var(--radius-md)',
          border: '2px solid var(--brand-500)', marginBottom: '16px',
        }}>
          <canvas ref={canvasRef} style={{ display: qrReady ? 'block' : 'none' }} />
          {!qrReady && (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Generando QR...
            </div>
          )}
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>{asset.qrCodeId}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button onClick={handleDownload} className="btn btn-secondary btn-sm">⬇️ Descargar PNG</button>
          <button onClick={onClose} className="btn btn-primary btn-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel lateral detalle ────────────────────────────────────────────────────
function ClientDetailPanel({
  entry, onClose, onShowQr,
}: {
  entry: ClientWithAssets; onClose: () => void; onShowQr: (asset: Asset) => void;
}) {
  const { client, assets } = entry;
  return (
    <Card className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {SERVICE_TYPE_ICONS[client.serviceType]} {client.businessName}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-400)', marginTop: '2px' }}>{client.id}</div>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
      </div>

      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '12px', marginBottom: '14px' }}>
        {[
          { icon: '👤', label: client.contactName },
          { icon: '📧', label: client.contactEmail || '—' },
          { icon: '📞', label: client.contactPhone },
          { icon: '📍', label: [client.address, client.commune].filter(Boolean).join(', ') },
          ...(client.sector ? [{ icon: '🗺️', label: `Zona: ${client.sector}` }] : []),
        ].map((info) => (
          <div key={info.label} style={{ display: 'flex', gap: '10px', padding: '4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>{info.icon}</span>
            <span style={{ wordBreak: 'break-all' }}>{info.label}</span>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', color: 'var(--text-primary)' }}>
        Activos ({assets.length})
      </div>

      {assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Sin activos registrados
        </div>
      ) : (
        assets.map(asset => (
          <div key={asset.id} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>
                  {ASSET_TYPE_ICONS[asset.type] || '📦'} {asset.name}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{asset.id}</div>
              </div>
              <button onClick={() => onShowQr(asset)} title="Ver código QR" style={{
                background: 'white', border: '1px solid var(--bg-border)', borderRadius: '6px',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '16px', cursor: 'pointer', flexShrink: 0,
              }}>▦</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {asset.brand && <Badge color="gray">{asset.brand}{asset.model ? ` ${asset.model}` : ''}</Badge>}
              <Badge color="blue">{FREQ_LABEL(asset.maintenanceFrequencyDays)}</Badge>
              {asset.recurringSupplies.length > 0 && <Badge color="cyan">{asset.recurringSupplies.length} insumos</Badge>}
            </div>
          </div>
        ))
      )}

      <a href="/levantamiento" className="btn btn-secondary w-full" style={{ marginTop: '8px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
        + Agregar Activo
      </a>

      {client.notes && (
        <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', borderLeft: '3px solid var(--bg-border)' }}>
          📝 {client.notes}
        </div>
      )}
    </Card>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function ClientsPage() {
  const [data, setData] = useState<ClientWithAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState<ServiceType | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [showQrFor, setShowQrFor] = useState<Asset | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClientWithAssetsUC.executeAll();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Error cargando clientes. Verifica la conexión a Firebase.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = data.filter(({ client }) => {
    const matchSearch = search === '' ||
      client.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (client.rut || '').includes(search) ||
      client.id.toLowerCase().includes(search.toLowerCase()) ||
      (client.commune || '').toLowerCase().includes(search.toLowerCase());
    const matchService = filterService === 'all' || client.serviceType === filterService;
    return matchSearch && matchService;
  });

  const selectedEntry = data.find(d => d.client.id === selected);
  const totalAssets = data.reduce((acc, d) => acc + d.assets.length, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes y Activos</h1>
          <p className="page-desc">
            {loading ? 'Cargando...' : `${data.length} clientes · ${totalAssets} activos registrados`}
          </p>
        </div>
        <div className="page-header-actions">
          <a href="/levantamiento" className="btn btn-secondary btn-sm">📱 Levantamiento Móvil</a>
          <a href="/levantamiento" className="btn btn-primary btn-sm">+ Agregar Cliente</a>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px',
          fontSize: '13px', color: 'var(--danger-400)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={loadData} style={{ background: 'none', border: 'none', color: 'var(--danger-400)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Reintentar</button>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span className="search-icon">🔍</span>
          <input type="text" className="form-input" placeholder="Buscar cliente, RUT, ID, comuna..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '30px', fontSize: '13px', height: '36px', width: '100%' }} />
        </div>
        <select
          style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px', fontSize: '13px', color: 'var(--text-primary)', height: '36px', outline: 'none' }}
          value={filterService} onChange={e => setFilterService(e.target.value as ServiceType | 'all')}>
          <option value="all">Todos los servicios</option>
          {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map(k => (
            <option key={k} value={k}>{SERVICE_TYPE_ICONS[k]} {SERVICE_TYPE_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* Grid lista + panel */}
      <div className={`list-detail-grid${selected ? ' has-panel' : ''}`}>
        <Card>
          <SectionHeader
            title="Clientes Registrados"
            subtitle={`${filtered.length} de ${data.length} clientes`}
          />

          {loading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🏢"
              title={data.length === 0 ? 'Sin clientes registrados' : 'Sin resultados'}
              description={data.length === 0
                ? 'Comienza registrando tu primer cliente con el formulario de Levantamiento en Terreno.'
                : 'No hay clientes que coincidan con la búsqueda.'}
              action={data.length === 0 ? (
                <a href="/levantamiento" className="btn btn-primary btn-sm">📱 Iniciar Levantamiento</a>
              ) : undefined}
            />
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Cliente</th><th>Servicio</th><th>Activos</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ client, assets }) => (
                    <tr key={client.id}
                      onClick={() => setSelected(selected === client.id ? null : client.id)}
                      style={{ cursor: 'pointer', background: selected === client.id ? 'rgba(59,130,246,0.08)' : undefined }}>
                      <td><span className="font-mono text-sm" style={{ color: 'var(--brand-400)', fontSize: '11px' }}>{client.id}</span></td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>{client.businessName}</div>
                        <div className="text-xs text-secondary">{client.rut || client.commune || '—'}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '16px' }}>{SERVICE_TYPE_ICONS[client.serviceType]}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>{SERVICE_TYPE_LABELS[client.serviceType]}</span>
                      </td>
                      <td><Badge color="blue">{assets.length} {assets.length === 1 ? 'activo' : 'activos'}</Badge></td>
                      <td>
                        <Badge color={client.status === 'active' ? 'green' : client.status === 'suspended' ? 'red' : 'yellow'} dot>
                          {client.status === 'active' ? 'Activo' : client.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(client.id); }} title="Ver detalle">⋯</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {selectedEntry && (
          <ClientDetailPanel
            entry={selectedEntry}
            onClose={() => setSelected(null)}
            onShowQr={setShowQrFor}
          />
        )}
      </div>

      {showQrFor && (
        <QrModal
          asset={showQrFor}
          clientName={data.find(d => d.client.id === showQrFor.clientId)?.client.businessName || ''}
          onClose={() => setShowQrFor(null)}
        />
      )}
    </div>
  );
}
