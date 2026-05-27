export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        height: '56px',
        background: 'rgba(13, 21, 38, 0.97)',
        borderBottom: '1px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '22px' }}>📋</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              Levantamiento
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              MantOS · Registro en Terreno
            </div>
          </div>
        </div>
        <div style={{
          fontSize: '11px', color: 'var(--text-secondary)',
          background: 'var(--bg-surface)', padding: '4px 10px',
          borderRadius: '100px', border: '1px solid var(--bg-border)',
        }}>
          Modo Offline ✓
        </div>
      </header>
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
