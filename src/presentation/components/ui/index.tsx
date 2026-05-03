'use client';

import React from 'react';

// =============================================
// STAT CARD
// =============================================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'cyan' | 'green' | 'yellow' | 'red';
  trend?: { value: string; up: boolean };
}

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="stat-card animate-fade-up">
      <div className={`stat-icon ${color}`} style={{ fontSize: '22px' }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {trend && (
          <div className={`stat-trend ${trend.up ? 'up' : 'down'}`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// BADGE
// =============================================
type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'cyan';

interface BadgeProps {
  children: React.ReactNode;
  color: BadgeColor;
  dot?: boolean;
}

export function Badge({ children, color, dot }: BadgeProps) {
  return (
    <span className={`badge badge-${color}`}>
      {dot && (
        <span style={{
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: 'currentColor',
          display: 'inline-block',
        }} />
      )}
      {children}
    </span>
  );
}

// =============================================
// STATUS BADGE (para mantenimientos)
// =============================================
type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const map: Record<MaintenanceStatus, { label: string; color: BadgeColor }> = {
    pending:     { label: 'Pendiente',   color: 'yellow' },
    in_progress: { label: 'En Progreso', color: 'blue' },
    completed:   { label: 'Completado',  color: 'green' },
    cancelled:   { label: 'Cancelado',   color: 'red' },
  };
  const { label, color } = map[status];
  return <Badge color={color} dot>{label}</Badge>;
}

// =============================================
// CARD WRAPPER
// =============================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

// =============================================
// EMPTY STATE
// =============================================
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
      gap: '12px',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '360px' }}>{description}</div>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}

// =============================================
// MINI AVATAR ROW
// =============================================
interface AvatarGroupProps {
  names: string[];
  max?: number;
}

export function AvatarGroup({ names, max = 3 }: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((name, i) => (
        <div key={name} className="avatar avatar-sm" title={name} style={{
          marginLeft: i > 0 ? '-8px' : '0',
          border: '2px solid var(--bg-card)',
          zIndex: max - i,
          fontSize: '10px',
        }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      ))}
      {remaining > 0 && (
        <div className="avatar avatar-sm" style={{
          marginLeft: '-8px',
          background: 'var(--bg-hover)',
          color: 'var(--text-secondary)',
          fontSize: '10px',
          border: '2px solid var(--bg-card)',
        }}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

// =============================================
// PROGRESS BAR
// =============================================
interface ProgressBarProps {
  value: number;   // 0–100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({ value, color = 'var(--gradient-brand)', height = 6, showLabel }: ProgressBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        flex: 1, height, background: 'var(--bg-border)',
        borderRadius: '100px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${Math.min(value, 100)}%`,
          background: color, borderRadius: '100px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '32px' }}>
          {value}%
        </span>
      )}
    </div>
  );
}

// =============================================
// SECTION HEADER
// =============================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
