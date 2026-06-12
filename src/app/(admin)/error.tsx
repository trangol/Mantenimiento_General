'use client';

/**
 * Error boundary del segmento (admin).
 * Evita que una excepción en una página bote toda la app (y con ella
 * cualquier formulario abierto). Permite reintentar sin recargar.
 */

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2 style={{ color: 'var(--text-primary)', margin: '12px 0 4px' }}>Algo salió mal en este módulo</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
        {error.message || 'Error inesperado'}
      </p>
      <button className="btn btn-primary" onClick={reset}>Reintentar</button>
    </div>
  );
}
