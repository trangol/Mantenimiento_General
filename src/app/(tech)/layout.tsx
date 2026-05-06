export default function TechLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        height: '56px', background: 'rgba(13, 21, 38, 0.95)', borderBottom: '1px solid var(--bg-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '20px' }}>⚡</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>MantOS Terreno</div>
        </div>
        <div className="avatar avatar-sm">JP</div>
      </header>
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
