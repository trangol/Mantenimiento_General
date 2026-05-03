import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'MantOS | Plataforma de Gestión de Mantenimiento',
    template: '%s | MantOS',
  },
  description: 'Plataforma SaaS multirrubro para gestión de mantenimiento. Administra piscinas, sistemas HVAC, seguridad electrónica y más.',
  keywords: ['mantenimiento', 'piscinas', 'HVAC', 'SaaS', 'Chile', 'gestión'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
