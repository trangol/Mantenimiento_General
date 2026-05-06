'use client';

import React, { useState, useEffect } from 'react';
import { Card, SectionHeader, StatusBadge, Badge, EmptyState } from '@/presentation/components/ui';
import { FirestoreMaintenanceRecordRepository } from '@/infrastructure/firebase/repositories/FirestoreMaintenanceRecordRepository';
import { MaintenanceRecord, MaintenanceStatus } from '@/core/domain/MaintenanceRecord';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/firebaseConfig';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const repo = new FirestoreMaintenanceRecordRepository();

export function MaintenancePage() {
  const [ots, setOts] = useState<MaintenanceRecord[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Escucha en tiempo real de la colección
      const q = query(collection(db, 'maintenance_records'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduledDate: data.scheduledDate?.toDate()?.toLocaleDateString('es-CL') || 'Sin fecha',
            startedAt: data.startedAt?.toDate()?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            completedAt: data.completedAt?.toDate()?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            // Guardamos los Date crudos para el dominio, pero aquí los formateamos fácil para la UI temporalmente
          } as any;
        });
        setOts(records);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setError('Error al conectar con Firestore. Verifica tu .env.local');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setError('Falta configuración de Firebase');
      setLoading(false);
    }
  }, []);

  const injectTestOT = async () => {
    try {
      setError(null);
      const randomNum = Math.floor(Math.random() * 10000);
      const newOT: MaintenanceRecord = {
        id: `OT-${randomNum}`,
        assetId: 'ASSET-123',
        assetName: 'Piscina de Prueba',
        clientId: 'CLI-123',
        clientName: 'Cliente Demo Firestore',
        technicianId: 'TECH-1',
        technicianName: 'Técnico de Turno',
        status: 'pending',
        scheduledDate: new Date(),
        initialPhotos: [],
        finalPhotos: [],
        observations: 'Prueba desde la UI conectada a Firebase',
        suppliesUsed: [],
        totalCost: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await repo.create(newOT);
    } catch (err: any) {
      setError(err.message || 'Error al escribir en Firestore');
    }
  };

  const advanceStatus = async (ot: any) => {
    try {
      const nextMap: Record<string, MaintenanceStatus> = {
        'pending': 'in_progress',
        'in_progress': 'completed',
        'completed': 'pending'
      };
      const nextStatus = nextMap[ot.status] || 'pending';
      await repo.updateStatus(ot.id, nextStatus as MaintenanceStatus);
      
      // Si cambia a completado, simulamos poner la hora final
      if (nextStatus === 'completed') {
        await repo.update(ot.id, { completedAt: new Date() });
      } else if (nextStatus === 'in_progress') {
        await repo.update(ot.id, { startedAt: new Date(), completedAt: undefined });
      }
    } catch(err) {
      console.error(err);
    }
  };

  const filtered = ots.filter((ot) => {
    const matchStatus = filter === 'all' || ot.status === filter;
    const matchSearch =
      search === '' ||
      (ot.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
      ot.id.toLowerCase().includes(search.toLowerCase()) ||
      (ot.technicianName || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: ots.length,
    pending: ots.filter(o => o.status === 'pending').length,
    in_progress: ots.filter(o => o.status === 'in_progress').length,
    completed: ots.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="animate-fade-in">
      {error && (
        <div style={{ background: 'var(--danger-500)', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 500 }}>
          ⚠️ {error} - Debes configurar las variables de entorno en el archivo .env.local
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mantenimientos (En Vivo)</h1>
          <p className="page-desc">Sincronizado en tiempo real con Firebase Firestore</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={injectTestOT}>⚡ Crear OT Prueba</button>
          <button className="btn btn-primary btn-sm">+ Nueva OT</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {([
          { key: 'all',         label: 'Todas' },
          { key: 'pending',     label: 'Pendientes' },
          { key: 'in_progress', label: 'En Progreso' },
          { key: 'completed',   label: 'Completadas' },
        ] as { key: StatusFilter; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f.label}
            <span style={{
              background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-border)',
              borderRadius: '100px',
              padding: '0 7px',
              fontSize: '11px',
              fontWeight: '600',
            }}>
              {counts[f.key]}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Búsqueda */}
        <div style={{ position: 'relative', width: '260px' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '14px', color: 'var(--text-muted)',
          }}>🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar cliente, OT, técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Cargando datos desde Firestore...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🔧"
              title="Sin registros en Firestore"
              description="No hay OTs en la base de datos. Haz clic en 'Crear OT Prueba' para inyectar datos."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Cliente</th>
                  <th>Activo</th>
                  <th>Técnico</th>
                  <th>Fecha</th>
                  <th>Inicio</th>
                  <th>Término</th>
                  <th>Estado</th>
                  <th>Acción Rápida</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ot: any) => (
                  <tr key={ot.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--brand-400)', fontSize: '13px' }}>
                        {ot.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{ot.clientName || ot.clientId}</div>
                    </td>
                    <td>
                      <div className="text-sm text-secondary">{ot.assetName || ot.assetId}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div className="avatar avatar-sm">
                          {(ot.technicianName || 'T')[0]}
                        </div>
                        <span style={{ fontSize: '13px' }}>{ot.technicianName}</span>
                      </div>
                    </td>
                    <td className="text-sm text-secondary">{ot.scheduledDate}</td>
                    <td>
                      {ot.startedAt
                        ? <Badge color="cyan">{ot.startedAt}</Badge>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      {ot.completedAt
                        ? <Badge color="green">{ot.completedAt}</Badge>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td><StatusBadge status={ot.status} /></td>
                    <td>
                      <button 
                        onClick={() => advanceStatus(ot)}
                        className="btn btn-ghost btn-sm" 
                        title="Cambiar estado"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        Avanzar →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
