'use client';

import React, { useState } from 'react';
import { Card, Badge, ProgressBar } from '@/presentation/components/ui';

export function ScanPage() {
  const [step, setStep] = useState<'scan' | 'checklist' | 'done'>('scan');

  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {step === 'scan' && (
        <div className="animate-fade-in" style={{ textAlign: 'center', marginTop: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Escanear Activo</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: '32px' }}>
            Ubica el código QR físico instalado en el equipo (piscina, motor, tablero).
          </p>

          {/* Simulador de cámara */}
          <div className="qr-scan-zone" onClick={() => setStep('checklist')}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.8 }}>📷</div>
            <div style={{ fontWeight: 600, color: 'var(--brand-400)' }}>Tocar para simular escaneo</div>
          </div>
          
          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
            OTs asignadas hoy: <strong>8</strong>
          </div>
        </div>
      )}

      {step === 'checklist' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header del Activo */}
          <div style={{ background: 'var(--gradient-brand)', padding: '20px', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <div className="text-xs" style={{ opacity: 0.8, marginBottom: '4px' }}>Club Las Araucarias</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Piscina Olímpica</div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px' }}>Volumen: 50m³</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px' }}>OT-2845</span>
            </div>
          </div>

          <Card style={{ padding: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '15px' }}>1. Fotos Iniciales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ height: '100px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--bg-border)' }}>+ Foto 1</div>
              <div style={{ height: '100px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--bg-border)' }}>+ Foto 2</div>
            </div>
          </Card>

          <Card style={{ padding: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '15px' }}>2. Checklist y Tareas</div>
            {[
              'Limpieza de superficie',
              'Aspirado de fondo',
              'Limpieza de canastillo',
              'Medición Ph/Cloro',
              'Aplicación de químicos'
            ].map((task, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i === 4 ? 'none' : '1px solid var(--bg-border)' }}>
                <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: 'var(--brand-500)' }} />
                <span className="text-sm">{task}</span>
              </label>
            ))}
          </Card>

          <Card style={{ padding: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '15px' }}>3. Insumos Utilizados</div>
            <button className="btn btn-secondary w-full text-sm">+ Agregar de Inventario Vehículo</button>
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              • Cloro Granulado (2kg) <br/>
              • Pastillas Cloro (1 un)
            </div>
          </Card>

          <button className="btn btn-primary w-full btn-lg" style={{ marginTop: '8px' }} onClick={() => setStep('done')}>
            Finalizar Mantenimiento
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="animate-fade-up" style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--success-400)' }}>OT Cerrada Exitosamente</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: '32px' }}>
            El registro ha sido sincronizado y el PDF se ha generado para el cliente.
          </p>
          <button className="btn btn-secondary w-full" onClick={() => setStep('scan')}>
            Escanear Próximo Activo
          </button>
        </div>
      )}

    </div>
  );
}
