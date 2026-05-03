import { Sidebar } from '@/presentation/components/layout/Sidebar';
import { Topbar } from '@/presentation/components/layout/Topbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Panel Administrador" subtitle="MantOS — Gestión de Mantenimiento" />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
