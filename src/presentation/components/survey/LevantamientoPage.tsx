'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CreateClientUseCase } from '@/use-cases/clients/CreateClientUseCase';
import { CreateAssetUseCase } from '@/use-cases/assets/CreateAssetUseCase';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { ServiceType } from '@/core/domain/Client';
import { AssetType, RecurringSupply } from '@/core/domain/Asset';

// ─── Instanciación de use cases (DIP: dependen de interfaces) ───────────────
const createClientUC = new CreateClientUseCase(repositories.clients);
const createAssetUC = new CreateAssetUseCase(repositories.assets, repositories.clients);

// ─── Tipos de formulario ─────────────────────────────────────────────────────
interface ClientFormData {
  businessName: string;
  rut: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  commune: string;
  sector: string;
  serviceType: ServiceType;
  notes: string;
}

interface AssetFormData {
  name: string;
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string;
  locationDescription: string;
  maintenanceFrequencyDays: number;
  notes: string;
}

interface MetadataField {
  key: string;
  label: string;
  unit?: string;
  type: 'text' | 'number';
}

// ─── Metadata por tipo de activo (OCP: extensible sin modificar el core) ───
const ASSET_METADATA_TEMPLATES: Record<AssetType, MetadataField[]> = {
  piscina: [
    { key: 'volume_m3', label: 'Volumen', unit: 'm³', type: 'number' },
    { key: 'filterType', label: 'Tipo de filtro', type: 'text' },
    { key: 'pumpBrand', label: 'Marca bomba', type: 'text' },
    { key: 'pumpModel', label: 'Modelo bomba', type: 'text' },
    { key: 'waterTreatment', label: 'Tratamiento agua', type: 'text' },
    { key: 'poolType', label: 'Tipo piscina', type: 'text' },
    { key: 'chlorinator', label: 'Clorificador', type: 'text' },
  ],
  hvac: [
    { key: 'capacityBtu', label: 'Capacidad', unit: 'BTU', type: 'number' },
    { key: 'refrigerantType', label: 'Tipo refrigerante', type: 'text' },
    { key: 'interiorUnits', label: 'N° unidades interiores', type: 'number' },
    { key: 'compressorBrand', label: 'Marca compresor', type: 'text' },
  ],
  motor: [
    { key: 'powerHp', label: 'Potencia', unit: 'HP', type: 'number' },
    { key: 'voltage', label: 'Voltaje', unit: 'V', type: 'number' },
    { key: 'amperage', label: 'Amperaje', unit: 'A', type: 'number' },
    { key: 'rpm', label: 'RPM', type: 'number' },
  ],
  tablero: [
    { key: 'voltage', label: 'Voltaje', unit: 'V', type: 'number' },
    { key: 'amperage', label: 'Amperaje', unit: 'A', type: 'number' },
    { key: 'phases', label: 'N° fases', type: 'number' },
    { key: 'breakerCount', label: 'N° breakers', type: 'number' },
  ],
  seguridad_electronica: [
    { key: 'camerasCount', label: 'N° cámaras', type: 'number' },
    { key: 'sensorsCount', label: 'N° sensores', type: 'number' },
    { key: 'centralBrand', label: 'Marca central', type: 'text' },
    { key: 'dvr', label: 'DVR/NVR', type: 'text' },
  ],
  incendio: [
    { key: 'detectorsCount', label: 'N° detectores', type: 'number' },
    { key: 'sprinklersCount', label: 'N° sprinklers', type: 'number' },
    { key: 'panelBrand', label: 'Marca panel', type: 'text' },
    { key: 'extinguishersCount', label: 'N° extintores', type: 'number' },
  ],
  bomba: [
    { key: 'powerHp', label: 'Potencia', unit: 'HP', type: 'number' },
    { key: 'flowRate', label: 'Caudal', unit: 'L/min', type: 'number' },
    { key: 'maxHead', label: 'Altura máx.', unit: 'm', type: 'number' },
  ],
  generador: [
    { key: 'powerKva', label: 'Potencia', unit: 'KVA', type: 'number' },
    { key: 'fuelType', label: 'Combustible', type: 'text' },
    { key: 'tankCapacity', label: 'Capacidad estanque', unit: 'L', type: 'number' },
  ],
  ascensor: [
    { key: 'capacity', label: 'Capacidad', unit: 'kg', type: 'number' },
    { key: 'stops', label: 'N° paradas', type: 'number' },
    { key: 'speed', label: 'Velocidad', unit: 'm/s', type: 'number' },
  ],
  otro: [
    { key: 'description', label: 'Descripción técnica', type: 'text' },
    { key: 'capacity', label: 'Capacidad/Potencia', type: 'text' },
  ],
};

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  piscinas: '🏊 Piscinas',
  hvac: '❄️ HVAC / Climatización',
  seguridad_electronica: '📹 Seguridad Electrónica',
  incendio: '🔥 Sistemas de Incendio',
  motores: '⚙️ Motores',
  tableros: '⚡ Tableros Eléctricos',
  general: '🔧 Mantenimiento General',
  otro: '📦 Otro',
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  piscina: '🏊 Piscina',
  hvac: '❄️ HVAC',
  motor: '⚙️ Motor',
  tablero: '⚡ Tablero',
  seguridad_electronica: '📹 Seguridad',
  incendio: '🔥 Incendio',
  bomba: '💧 Bomba',
  generador: '🔋 Generador',
  ascensor: '🛗 Ascensor',
  otro: '📦 Otro',
};

// ─── Estilos inline (mobile-first, consistentes con el design system) ───────
const S = {
  container: {
    padding: '16px',
    maxWidth: '520px',
    margin: '0 auto',
    paddingBottom: '100px',
  } as React.CSSProperties,
  stepHeader: {
    background: 'var(--bg-card)',
    border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '16px',
  } as React.CSSProperties,
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--text-primary)',
    outline: 'none',
    WebkitAppearance: 'none',
  } as React.CSSProperties,
  select: {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--text-primary)',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='%2394a3b8' d='M7 7l3 3 3-3'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '18px',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  btnPrimary: {
    background: 'var(--gradient-brand)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '15px 24px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,
  btnSecondary: {
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-md)',
    padding: '13px 24px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  } as React.CSSProperties,
  fieldGroup: {
    marginBottom: '14px',
  } as React.CSSProperties,
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  } as React.CSSProperties,
  errorMsg: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--danger-400)',
    marginBottom: '12px',
  } as React.CSSProperties,
  successBox: {
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    textAlign: 'center',
  } as React.CSSProperties,
};

// ─── Progress Bar ────────────────────────────────────────────────────────────
const STEPS = ['Cliente', 'Activo', 'Técnica', 'Insumos', 'Fotos', 'Confirmar'];

function ProgressBar({ current }: { current: number }) {
  return (
    <div style={{ padding: '12px 16px 0', background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)', marginBottom: '0' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {STEPS.map((step, i) => (
          <div
            key={step}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: i <= current ? 'var(--brand-500)' : 'var(--bg-border)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Paso {current + 1} de {STEPS.length}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)' }}>
          {STEPS[current]}
        </span>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function LevantamientoPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del formulario
  const [clientData, setClientData] = useState<ClientFormData>({
    businessName: '',
    rut: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    commune: '',
    sector: '',
    serviceType: 'piscinas',
    notes: '',
  });

  const [assetData, setAssetData] = useState<AssetFormData>({
    name: '',
    type: 'piscina',
    brand: '',
    model: '',
    serialNumber: '',
    locationDescription: '',
    maintenanceFrequencyDays: 7,
    notes: '',
  });

  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [supplies, setSupplies] = useState<RecurringSupply[]>([]);
  const [photos, setPhotos] = useState<string[]>([]); // base64 en preview local
  const [newSupply, setNewSupply] = useState<RecurringSupply>({ name: '', estimatedQty: 1, unit: 'unidad' });

  // Resultado final
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [savedQrId, setSavedQrId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers genéricos ──────────────────────────────────────────────────
  const updateClient = (field: keyof ClientFormData, value: string) =>
    setClientData(prev => ({ ...prev, [field]: value }));

  const updateAsset = (field: keyof AssetFormData, value: string | number) =>
    setAssetData(prev => ({ ...prev, [field]: value }));

  const updateMetadata = (key: string, value: string) =>
    setMetadata(prev => ({ ...prev, [key]: value }));

  // ── Foto desde cámara/galería ────────────────────────────────────────────
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setPhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Agregar insumo recurrente ────────────────────────────────────────────
  const addSupply = () => {
    if (!newSupply.name.trim()) return;
    setSupplies(prev => [...prev, { ...newSupply }]);
    setNewSupply({ name: '', estimatedQty: 1, unit: 'unidad' });
  };

  const removeSupply = (idx: number) =>
    setSupplies(prev => prev.filter((_, i) => i !== idx));

  // ── Validaciones por paso ────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!clientData.businessName.trim()) return 'El nombre/razón social es obligatorio.';
      if (!clientData.contactName.trim()) return 'El nombre de contacto es obligatorio.';
      if (!clientData.contactPhone.trim()) return 'El teléfono de contacto es obligatorio.';
      if (!clientData.address.trim()) return 'La dirección es obligatoria.';
    }
    if (s === 1) {
      if (!assetData.name.trim()) return 'El nombre del activo es obligatorio.';
      if (assetData.maintenanceFrequencyDays < 1) return 'La frecuencia debe ser al menos 1 día.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setError(null);
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Guardar en Firestore ─────────────────────────────────────────────────
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Crear cliente
      const client = await createClientUC.execute({
        ...clientData,
        rut: clientData.rut || undefined,
        sector: clientData.sector || undefined,
        commune: clientData.commune || undefined,
        notes: clientData.notes || undefined,
      });

      // 2. Crear activo bajo ese cliente
      const coercedMetadata: Record<string, string | number | boolean> = {};
      const template = ASSET_METADATA_TEMPLATES[assetData.type];
      template.forEach(field => {
        const val = metadata[field.key];
        if (val !== undefined && val !== '') {
          coercedMetadata[field.key] = field.type === 'number' ? Number(val) : val;
        }
      });

      const asset = await createAssetUC.execute({
        clientId: client.id,
        name: assetData.name,
        type: assetData.type,
        brand: assetData.brand || undefined,
        model: assetData.model || undefined,
        serialNumber: assetData.serialNumber || undefined,
        locationDescription: assetData.locationDescription || undefined,
        maintenanceFrequencyDays: assetData.maintenanceFrequencyDays,
        metadata: coercedMetadata,
        recurringSupplies: supplies,
        initialPhotos: [], // En prod: subir a Firebase Storage y guardar URLs
        notes: assetData.notes || undefined,
      });

      setSavedClientId(client.id);
      setSavedAssetId(asset.id);
      setSavedQrId(asset.qrCodeId);
      setStep(STEPS.length); // paso de éxito
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER POR PASO
  // ────────────────────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="animate-fade-in">
      <div style={S.stepHeader}>
        <div style={{ fontSize: '22px', marginBottom: '6px' }}>🏢</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Datos del Cliente</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Ingresa la información del cliente. Será el ID maestro en todo el sistema.
        </div>
      </div>

      <div style={S.card}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Razón Social / Nombre *</label>
          <input style={S.input} value={clientData.businessName}
            onChange={e => updateClient('businessName', e.target.value)}
            placeholder="Ej: Club de Campo Las Araucarias" />
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>RUT</label>
            <input style={S.input} value={clientData.rut}
              onChange={e => updateClient('rut', e.target.value)}
              placeholder="76.345.123-4" />
          </div>
          <div>
            <label style={S.label}>Tipo de Servicio *</label>
            <select style={S.select} value={clientData.serviceType}
              onChange={e => updateClient('serviceType', e.target.value as ServiceType)}>
              {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Nombre Contacto *</label>
          <input style={S.input} value={clientData.contactName}
            onChange={e => updateClient('contactName', e.target.value)}
            placeholder="Rodrigo Herrera" />
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>Teléfono *</label>
            <input style={S.input} type="tel" value={clientData.contactPhone}
              onChange={e => updateClient('contactPhone', e.target.value)}
              placeholder="+56 9 8765 4321" />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={clientData.contactEmail}
              onChange={e => updateClient('contactEmail', e.target.value)}
              placeholder="contacto@empresa.cl" />
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Dirección *</label>
          <input style={S.input} value={clientData.address}
            onChange={e => updateClient('address', e.target.value)}
            placeholder="Camino Las Araucarias 1250" />
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>Comuna</label>
            <input style={S.input} value={clientData.commune}
              onChange={e => updateClient('commune', e.target.value)}
              placeholder="Lo Barnechea" />
          </div>
          <div>
            <label style={S.label}>Sector / Zona</label>
            <input style={S.input} value={clientData.sector}
              onChange={e => updateClient('sector', e.target.value)}
              placeholder="Zona Norte" />
          </div>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Observaciones</label>
          <textarea style={S.textarea} value={clientData.notes}
            onChange={e => updateClient('notes', e.target.value)}
            placeholder="Acceso por portería lateral, preguntar por el conserje..." />
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="animate-fade-in">
      <div style={S.stepHeader}>
        <div style={{ fontSize: '22px', marginBottom: '6px' }}>⚙️</div>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Datos del Activo</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Cliente: <strong style={{ color: 'var(--brand-400)' }}>{clientData.businessName}</strong>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Nombre del Activo *</label>
          <input style={S.input} value={assetData.name}
            onChange={e => updateAsset('name', e.target.value)}
            placeholder="Ej: Piscina Principal, Motor Nº1, Tablero General" />
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>Tipo *</label>
            <select style={S.select} value={assetData.type}
              onChange={e => {
                updateAsset('type', e.target.value as AssetType);
                setMetadata({}); // reset metadata al cambiar tipo
              }}>
              {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Frecuencia Mant.</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input style={{ ...S.input, textAlign: 'center' }}
                type="number" min="1" value={assetData.maintenanceFrequencyDays}
                onChange={e => updateAsset('maintenanceFrequencyDays', parseInt(e.target.value) || 1)} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>días</span>
            </div>
          </div>
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>Marca</label>
            <input style={S.input} value={assetData.brand}
              onChange={e => updateAsset('brand', e.target.value)}
              placeholder="Hayward, Carrier..." />
          </div>
          <div>
            <label style={S.label}>Modelo</label>
            <input style={S.input} value={assetData.model}
              onChange={e => updateAsset('model', e.target.value)}
              placeholder="SP3007X152" />
          </div>
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>N° Serie</label>
            <input style={S.input} value={assetData.serialNumber}
              onChange={e => updateAsset('serialNumber', e.target.value)}
              placeholder="SN-XXXXXXXX" />
          </div>
          <div>
            <label style={S.label}>Ubicación</label>
            <input style={S.input} value={assetData.locationDescription}
              onChange={e => updateAsset('locationDescription', e.target.value)}
              placeholder="Sector Poniente, sótano" />
          </div>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Observaciones del Activo</label>
          <textarea style={S.textarea} value={assetData.notes}
            onChange={e => updateAsset('notes', e.target.value)}
            placeholder="Estado general, condiciones de acceso, historial conocido..." />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const fields = ASSET_METADATA_TEMPLATES[assetData.type];
    return (
      <div className="animate-fade-in">
        <div style={S.stepHeader}>
          <div style={{ fontSize: '22px', marginBottom: '6px' }}>
            {ASSET_TYPE_LABELS[assetData.type].split(' ')[0]}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            Ficha Técnica — {ASSET_TYPE_LABELS[assetData.type]}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {assetData.name} · {clientData.businessName}
          </div>
        </div>

        <div style={S.card}>
          {fields.map((field) => (
            <div style={S.fieldGroup} key={field.key}>
              <label style={S.label}>
                {field.label}{field.unit ? ` (${field.unit})` : ''}
              </label>
              <input
                style={S.input}
                type={field.type === 'number' ? 'number' : 'text'}
                value={metadata[field.key] || ''}
                onChange={e => updateMetadata(field.key, e.target.value)}
                placeholder={field.type === 'number' ? '0' : field.label}
              />
            </div>
          ))}

          {fields.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No hay campos técnicos predefinidos para este tipo.<br />
              Puedes agregar observaciones en el paso anterior.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="animate-fade-in">
      <div style={S.stepHeader}>
        <div style={{ fontSize: '22px', marginBottom: '6px' }}>📦</div>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Insumos Recurrentes</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Define los productos que se usan habitualmente en cada mantención de este activo.
          Se precargarán automáticamente al iniciar un trabajo.
        </div>
      </div>

      {/* Lista de insumos agregados */}
      {supplies.length > 0 && (
        <div style={S.card}>
          {supplies.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: i < supplies.length - 1 ? '1px solid var(--bg-border)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {s.estimatedQty} {s.unit} por mantención
                  {s.notes ? ` · ${s.notes}` : ''}
                </div>
              </div>
              <button
                onClick={() => removeSupply(i)}
                style={{ background: 'none', border: 'none', color: 'var(--danger-400)', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario agregar insumo */}
      <div style={S.card}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          + Agregar Insumo
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Nombre del Insumo</label>
          <input style={S.input} value={newSupply.name}
            onChange={e => setNewSupply(p => ({ ...p, name: e.target.value }))}
            placeholder="Ej: Cloro Granulado, Pastillas Tricloro..." />
        </div>

        <div style={{ ...S.fieldGroup, ...S.row2 }}>
          <div>
            <label style={S.label}>Cantidad Estimada</label>
            <input style={S.input} type="number" min="0" step="0.1"
              value={newSupply.estimatedQty}
              onChange={e => setNewSupply(p => ({ ...p, estimatedQty: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label style={S.label}>Unidad</label>
            <select style={S.select} value={newSupply.unit}
              onChange={e => setNewSupply(p => ({ ...p, unit: e.target.value }))}>
              {['unidad', 'kg', 'g', 'L', 'mL', 'm', 'caja', 'par', 'rollo', 'otro'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Nota (opcional)</label>
          <input style={S.input} value={newSupply.notes || ''}
            onChange={e => setNewSupply(p => ({ ...p, notes: e.target.value }))}
            placeholder="Ej: según resultado de medición..." />
        </div>

        <button
          onClick={addSupply}
          disabled={!newSupply.name.trim()}
          style={{
            ...S.btnSecondary,
            opacity: !newSupply.name.trim() ? 0.5 : 1,
          }}
        >
          ＋ Agregar Insumo a la Lista
        </button>
      </div>

      {supplies.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Puedes continuar sin insumos y agregarlos después.
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-fade-in">
      <div style={S.stepHeader}>
        <div style={{ fontSize: '22px', marginBottom: '6px' }}>📸</div>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Fotos Estado Inicial</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Documenta el estado actual del activo. Estas fotos quedan como referencia de línea base.
        </div>
      </div>

      {/* Preview de fotos */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Foto ${i + 1}`}
                style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)' }}
              />
              <button
                onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'rgba(0,0,0,0.7)', color: 'white',
                  border: 'none', borderRadius: '50%',
                  width: '24px', height: '24px', cursor: 'pointer',
                  fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Botón cámara */}
      <div style={S.card}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePhotoCapture}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
            style={{
              ...S.btnSecondary,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '8px', padding: '20px 12px',
            }}
          >
            <span style={{ fontSize: '28px' }}>📷</span>
            <span style={{ fontSize: '13px' }}>Tomar Foto</span>
          </button>

          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
            style={{
              ...S.btnSecondary,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '8px', padding: '20px 12px',
            }}
          >
            <span style={{ fontSize: '28px' }}>🖼️</span>
            <span style={{ fontSize: '13px' }}>Galería</span>
          </button>
        </div>

        <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          {photos.length} foto{photos.length !== 1 ? 's' : ''} adjunta{photos.length !== 1 ? 's' : ''}
          {' · '}Recomendado: foto general, plaqueta, estado actual
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
        Las fotos se pueden agregar después. Este paso es opcional.
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="animate-fade-in">
      <div style={S.stepHeader}>
        <div style={{ fontSize: '22px', marginBottom: '6px' }}>✅</div>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Confirmar y Guardar</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Revisa el resumen antes de guardar en el sistema.
        </div>
      </div>

      {/* Resumen Cliente */}
      <div style={S.card}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-400)', letterSpacing: '0.06em', marginBottom: '10px', textTransform: 'uppercase' }}>
          🏢 CLIENTE
        </div>
        {[
          { l: 'Nombre', v: clientData.businessName },
          { l: 'RUT', v: clientData.rut || '—' },
          { l: 'Servicio', v: SERVICE_TYPE_LABELS[clientData.serviceType] },
          { l: 'Contacto', v: `${clientData.contactName} · ${clientData.contactPhone}` },
          { l: 'Dirección', v: `${clientData.address}${clientData.commune ? `, ${clientData.commune}` : ''}` },
        ].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--bg-surface)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{r.l}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{r.v}</span>
          </div>
        ))}
      </div>

      {/* Resumen Activo */}
      <div style={S.card}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-400)', letterSpacing: '0.06em', marginBottom: '10px', textTransform: 'uppercase' }}>
          ⚙️ ACTIVO
        </div>
        {[
          { l: 'Nombre', v: assetData.name },
          { l: 'Tipo', v: ASSET_TYPE_LABELS[assetData.type] },
          { l: 'Marca / Modelo', v: [assetData.brand, assetData.model].filter(Boolean).join(' · ') || '—' },
          { l: 'Frecuencia', v: `Cada ${assetData.maintenanceFrequencyDays} días` },
          { l: 'Insumos', v: `${supplies.length} insumo${supplies.length !== 1 ? 's' : ''} registrado${supplies.length !== 1 ? 's' : ''}` },
          { l: 'Fotos', v: `${photos.length} foto${photos.length !== 1 ? 's' : ''}` },
        ].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid var(--bg-surface)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{r.l}</span>
            <span style={{ fontWeight: 500 }}>{r.v}</span>
          </div>
        ))}
      </div>

      {error && <div style={S.errorMsg}>⚠️ {error}</div>}

      <button
        onClick={handleSave}
        disabled={loading}
        style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? '⏳ Guardando en el sistema...' : '💾 Guardar Cliente y Activo'}
      </button>
    </div>
  );

  // ── Pantalla de éxito con QR generado ────────────────────────────────────
  if (step >= STEPS.length && savedQrId) {
    return (
      <div style={S.container}>
        <div className="animate-fade-in" style={S.successBox}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success-400)', marginBottom: '8px' }}>
            ¡Levantamiento Completado!
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            El cliente y activo han sido registrados exitosamente en el sistema.
          </div>

          {/* IDs generados */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
            {[
              { l: 'ID Cliente', v: savedClientId, color: 'var(--brand-400)' },
              { l: 'ID Activo', v: savedAssetId, color: 'var(--accent-400)' },
              { l: 'Código QR', v: savedQrId, color: 'var(--success-400)' },
            ].map(r => (
              <div key={r.l} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{r.l}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: r.color }}>{r.v}</div>
              </div>
            ))}
          </div>

          {/* QR Visual */}
          <QrDisplay qrId={savedQrId} assetName={assetData.name} clientName={clientData.businessName} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
            <button
              style={S.btnSecondary}
              onClick={() => {
                // Reset para nuevo levantamiento
                setStep(0);
                setClientData({ businessName: '', rut: '', contactName: '', contactEmail: '', contactPhone: '', address: '', commune: '', sector: '', serviceType: 'piscinas', notes: '' });
                setAssetData({ name: '', type: 'piscina', brand: '', model: '', serialNumber: '', locationDescription: '', maintenanceFrequencyDays: 7, notes: '' });
                setMetadata({}); setSupplies([]); setPhotos([]);
                setSavedClientId(null); setSavedAssetId(null); setSavedQrId(null);
              }}
            >
              ＋ Nuevo Activo
            </button>
            <button
              style={S.btnPrimary}
              onClick={() => window.location.href = '/clients'}
            >
              Ver Clientes →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render principal por paso ─────────────────────────────────────────────
  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div>
      <ProgressBar current={step} />

      <div style={S.container}>
        {error && step < 5 && <div style={S.errorMsg}>⚠️ {error}</div>}

        {stepRenderers[step]?.()}

        {/* Botones de navegación */}
        <div style={{ display: 'grid', gridTemplateColumns: step > 0 ? '1fr 2fr' : '1fr', gap: '10px', marginTop: '20px' }}>
          {step > 0 && (
            <button style={S.btnSecondary} onClick={back}>
              ← Atrás
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button style={S.btnPrimary} onClick={next}>
              {step === STEPS.length - 2 ? 'Revisar →' : 'Continuar →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente QR visual (canvas-based, sin dependencias externas) ──────────
function QrDisplay({ qrId, assetName, clientName }: { qrId: string; assetName: string; clientName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  React.useEffect(() => {
    // Carga dinámica de la librería QRCode para no afectar el bundle inicial
    import('qrcode').then(QRCode => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      QRCode.toCanvas(canvas, qrId, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1e3a8a',
          light: '#ffffff',
        },
      }, ( err: Error | null | undefined) => {
        if (!err) setQrGenerated(true);
      });
    }).catch(() => {
      // Si qrcode no está instalado, mostrar el ID en texto
      setQrGenerated(true);
    });
  }, [qrId]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${qrId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        background: 'white', padding: '16px', borderRadius: 'var(--radius-md)',
        border: '2px solid var(--brand-500)', display: 'inline-block',
      }}>
        <canvas ref={canvasRef} style={{ display: qrGenerated ? 'block' : 'none' }} />
        {!qrGenerated && (
          <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', fontSize: '12px' }}>
            Generando QR...
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{clientName}</div>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>{assetName}</div>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{qrId}</div>
      </div>

      <button onClick={handleDownload} style={{
        background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
        borderRadius: 'var(--radius-sm)', padding: '10px 20px',
        color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
      }}>
        ⬇️ Descargar QR para Imprimir
      </button>
    </div>
  );
}
