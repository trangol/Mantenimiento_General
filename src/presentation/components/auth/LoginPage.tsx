'use client';

/**
 * LoginPage — Selector de rol unificado (sin Firebase Auth aún).
 *
 * El usuario elige su rol e ingresa su ID o código.
 * Persiste la sesión en localStorage y redirige al portal correspondiente.
 * Mobile-first: diseñado para celular del técnico en terreno.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setSession, getSession, UserRole } from '@/infrastructure/auth/RoleContext';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { DEFAULT_TENANT_ID } from '@/infrastructure/tenant/TenantContext';

type Step = 'role' | 'credentials';

const ROLE_OPTIONS = [
  {
    role: 'admin' as UserRole,
    label: 'Administrador',
    icon: '🖥️',
    desc: 'Acceso completo: coordinación, cobros, reportes',
    color: 'var(--brand-500)',
  },
  {
    role: 'tech' as UserRole,
    label: 'Técnico / Trabajador',
    icon: '🔧',
    desc: 'Portal de terreno: jornada del día y registro de servicios',
    color: '#10b981',
  },
  {
    role: 'client' as UserRole,
    label: 'Cliente',
    icon: '🏢',
    desc: 'Ver mis servicios, activos y estado de cuenta',
    color: '#8b5cf6',
  },
];

export function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Si ya hay sesión, redirigir directo
  useEffect(() => {
    const session = getSession();
    if (session) redirectByRole(session.role);
  }, []);

  function redirectByRole(role: UserRole) {
    if (role === 'admin') router.replace('/dashboard');
    else if (role === 'tech') router.replace('/tech/jornada');
    else router.replace('/portal');
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCode('');
    setError('');
    if (role === 'admin') {
      // Admin entra directo con PIN fijo (hasta tener Firebase Auth)
      setStep('credentials');
    } else {
      setStep('credentials');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !code.trim()) return;
    setLoading(true); setError('');

    try {
      const tenantId = DEFAULT_TENANT_ID;

      if (selectedRole === 'admin') {
        // PIN de admin: cualquier código no vacío en dev (hasta Firebase Auth)
        setSession({ role: 'admin', userId: 'admin', userName: 'Administrador', tenantId });
        router.replace('/dashboard');
        return;
      }

      if (selectedRole === 'tech') {
        // Buscar técnico por ID o nombre parcial
        const members = await repositories.team.getAll();
        const member = members.find(m =>
          m.id === code.trim() ||
          m.rut?.replace(/\./g, '').replace('-', '') === code.trim().replace(/\./g, '').replace('-', '') ||
          m.fullName.toLowerCase().includes(code.toLowerCase())
        );
        if (!member) throw new Error('Técnico no encontrado. Verifica tu código o nombre.');
        setSession({ role: 'tech', userId: member.id, userName: member.fullName, tenantId });
        router.replace('/tech/jornada');
        return;
      }

      if (selectedRole === 'client') {
        // Buscar cliente por código CLI-XXXXXXXX o nombre
        const client = code.toUpperCase().startsWith('CLI-')
          ? await repositories.clients.getById(code.toUpperCase())
          : null;
        if (!client) throw new Error('Cliente no encontrado. Usa tu código CLI-XXXXXXXX.');
        setSession({ role: 'client', userId: client.id, userName: client.businessName, tenantId });
        router.replace('/portal');
        return;
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  const selectedOpt = ROLE_OPTIONS.find(o => o.role === selectedRole);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚡</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>MantOS</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Plataforma de Mantenimientos</div>
        </div>

        {/* Paso 1: elegir rol */}
        {step === 'role' && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
              ¿Cómo ingresas hoy?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ROLE_OPTIONS.map(opt => (
                <button key={opt.role} onClick={() => handleRoleSelect(opt.role)} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }} onMouseEnter={e => (e.currentTarget.style.borderColor = opt.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}>
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 2: credenciales */}
        {step === 'credentials' && selectedOpt && (
          <div>
            <button onClick={() => { setStep('role'); setError(''); }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>← Volver</button>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '24px' }}>{selectedOpt.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{selectedOpt.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedOpt.desc}</div>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)', marginBottom: '14px' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">
                    {selectedRole === 'admin' ? 'Código de acceso (cualquier texto en modo demo)' :
                      selectedRole === 'tech' ? 'Tu nombre o código de técnico' :
                        'Código de cliente (CLI-XXXXXXXX)'}
                  </label>
                  <input
                    className="form-input"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder={
                      selectedRole === 'admin' ? 'admin' :
                        selectedRole === 'tech' ? 'Ej: Juan Pérez' :
                          'CLI-XXXXXXXX'
                    }
                    autoFocus
                    autoComplete="off"
                    style={{ fontSize: '16px' /* evita zoom en iOS */ }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading || !code.trim()} style={{ fontSize: '15px', padding: '12px' }}>
                  {loading ? '⏳ Verificando...' : 'Ingresar →'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
          MantOS · Plataforma SaaS de Mantenimiento · Chile
        </div>
      </div>
    </div>
  );
}
