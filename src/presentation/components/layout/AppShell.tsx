'use client';

/**
 * AppShell — Builder Pattern
 * Construye el shell completo de la app:
 * Provider → Sidebar + Overlay + MainContent
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getSession } from '@/infrastructure/auth/RoleContext';

function ShellInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();
  const router = useRouter();

  // Guard: solo admins pueden acceder al portal de administración
  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'admin') {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="app-shell">
      {/* Overlay para cerrar sidebar en mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <div className="main-content">
        <Topbar />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarProvider>
  );
}
