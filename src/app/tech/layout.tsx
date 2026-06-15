/**
 * Layout del portal técnico en terreno.
 * Sin sidebar admin — minimalista, mobile-first.
 * La autenticación y el header con logout los maneja TechJornadaPage directamente.
 */
export default function TechLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
