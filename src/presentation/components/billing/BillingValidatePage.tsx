'use client';

/**
 * BillingValidatePage — Paso 5 del flujo de cobros
 *
 * Permite subir un Excel con pagos recibidos (exportado del banco),
 * hace el cotejo automático contra las facturas emitidas, muestra
 * una tabla de revisión y el usuario confirma la conciliación.
 *
 * Formatos bancarios soportados (auto-detectados):
 *
 * 1. CuentaRUT (BancoEstado)
 *    Header en fila 13 (índice 13): Fecha | N° Operación | Descripción |
 *    Cheques / Cargos $ | Depósitos / Abonos $ | Saldo $
 *    Fecha: DD/MM/YYYY · Abonos en "Depósitos / Abonos $"
 *
 * 2. Cuenta Vista (Banco Santander)
 *    Header en fila 2 (índice 2): Fecha | Detalle | Monto cargo ($) |
 *    Monto abono ($) | Saldo ($)
 *    Fecha: DD-MM-YYYY · Abonos en "Monto abono ($)"
 *
 * 3. Genérico (fallback)
 *    Busca heurísticamente columnas fecha/monto/referencia en cualquier orden.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { Invoice, InvoiceStatus } from '@/core/domain/Invoice';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import * as XLSX from 'xlsx';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (d?: Date | null) => d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'cyan';
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador', pending: 'Emitido', partial: 'Pago parcial', paid: 'Pagado', overdue: 'Vencido', cancelled: 'Anulado',
};
const STATUS_COLORS: Record<InvoiceStatus, BadgeColor> = {
  draft: 'gray', pending: 'yellow', partial: 'blue', paid: 'green', overdue: 'red', cancelled: 'gray',
};

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if ((inv.status === 'pending' || inv.status === 'partial') && inv.dueDate < new Date()) return 'overdue';
  return inv.status;
}

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/** Fila del Excel de pagos del banco */
interface BankRow {
  fecha?: Date | string;
  monto: number;
  referencia?: string;
  descripcion?: string;
  rutCliente?: string;
  raw: Record<string, unknown>;
}

/** Resultado del cotejo */
type MatchStatus = 'matched' | 'partial' | 'unmatched' | 'already_paid';
interface MatchResult {
  invoice: Invoice;
  bankRow?: BankRow;
  matchStatus: MatchStatus;
  difference: number; // monto Excel - pendiente factura (positivo = sobrepago, negativo = falta)
}

// ── Parsear Excel ─────────────────────────────────────────────────────────────

/** Normaliza un string para comparación: minúsculas, sin tildes, sin espacios/guiones */
function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s_\-/()$°#]/g, '');
}

/** Busca la primera clave cuyo nombre normalizado contiene alguno de los candidatos */
function findCol(row: Record<string, unknown>, candidates: string[]): unknown {
  const key = Object.keys(row).find(k =>
    candidates.some(c => norm(k).includes(norm(c)))
  );
  return key ? row[key] : undefined;
}

/** Convierte un valor crudo a número CLP (maneja negativos, strings, etc.) */
function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw === null || raw === undefined || raw === '') return 0;
  const s = String(raw).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

/** Convierte DD/MM/YYYY o DD-MM-YYYY a Date */
function parseChileDate(raw: unknown): Date | undefined {
  if (raw instanceof Date) return raw;
  const s = String(raw ?? '').trim();
  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return undefined;
}

/**
 * Detecta el formato del banco leyendo las primeras filas del sheet como array.
 * Devuelve { headerRow, colFecha, colMonto, colRef, colDetalle }
 */
type BankFormat = {
  name: string;
  headerRow: number;
  colFecha: string;
  colMonto: string;       // columna de abonos/créditos
  colRef: string;         // número de operación / referencia
  colDetalle: string;     // glosa / detalle
};

function detectFormat(allRows: unknown[][]): BankFormat {
  for (let i = 0; i < allRows.length; i++) {
    const cells = allRows[i].map(c => norm(String(c ?? '')));

    // CuentaRUT BancoEstado:
    // headers: fecha | noperacion | descripcion | chequescargos | depositosabonos | saldo
    if (cells.some(c => c.includes('depositosabonos') || c.includes('depositosabono'))) {
      return {
        name: 'CuentaRUT (BancoEstado)',
        headerRow: i,
        colFecha: 'Fecha',
        colMonto: 'Depósitos / Abonos $',
        colRef: 'N° Operación',
        colDetalle: 'Descripción',
      };
    }

    // Cuenta Vista (BCI / otros):
    // headers: fecha | detalle | montocargo | montoabono | saldo
    if (cells.some(c => c.includes('montoabono') || c.includes('abono'))) {
      return {
        name: 'Cuenta Vista (Banco Santander)',
        headerRow: i,
        colFecha: 'Fecha',
        colMonto: 'Monto abono ($)',
        colRef: '',           // no tiene número de operación
        colDetalle: 'Detalle',
      };
    }
  }

  // Fallback genérico: sin metadata (row 0 ya son headers)
  return {
    name: 'Genérico',
    headerRow: 0,
    colFecha: 'fecha',
    colMonto: 'monto',
    colRef: 'referencia',
    colDetalle: 'descripcion',
  };
}

function parseExcel(file: File): Promise<{ rows: BankRow[]; bankName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Leer TODO como array de arrays para detectar el formato
        const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
        const fmt = detectFormat(allRows);

        // Leer a partir del header real
        const dataRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          range: fmt.headerRow,   // empieza desde la fila de headers
        });

        const parsed: BankRow[] = dataRows
          .map(row => {
            // Buscar columnas según el formato detectado
            const montoRaw = fmt.colMonto
              ? findCol(row, [fmt.colMonto, 'abono', 'credito', 'deposito'])
              : findCol(row, ['monto', 'amount', 'valor', 'importe', 'abono', 'credito']);

            const monto = toNumber(montoRaw);

            const fechaRaw = findCol(row, [fmt.colFecha, 'fecha', 'date', 'dia']);
            const fecha = parseChileDate(fechaRaw);

            const refRaw = fmt.colRef
              ? findCol(row, [fmt.colRef, 'referencia', 'noperacion', 'operacion', 'folio', 'num'])
              : findCol(row, ['referencia', 'ref', 'numero', 'num', 'folio', 'operacion']);

            const detRaw = findCol(row, [fmt.colDetalle, 'glosa', 'descripcion', 'detalle', 'concepto']);

            return {
              fecha: fecha ?? (fechaRaw as string | undefined),
              monto,
              referencia: String(refRaw ?? '').trim(),
              descripcion: String(detRaw ?? '').trim(),
              rutCliente: String(findCol(row, ['rut', 'cliente', 'ruc']) ?? '').trim(),
              raw: row,
            } satisfies BankRow;
          })
          .filter(r => r.monto > 0); // Solo abonos/créditos

        resolve({ rows: parsed, bankName: fmt.name });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/** Cotejar filas del banco con facturas pendientes */
function match(invoices: Invoice[], bankRows: BankRow[]): MatchResult[] {
  const results: MatchResult[] = [];
  const usedBankRows = new Set<number>();

  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled') {
      results.push({ invoice: inv, matchStatus: 'already_paid', difference: 0 });
      continue;
    }

    // Intentar cotejar por monto similar (±5%) o referencia (número de factura)
    let bestMatch: { rowIdx: number; row: BankRow } | null = null;

    for (let i = 0; i < bankRows.length; i++) {
      if (usedBankRows.has(i)) continue;
      const row = bankRows[i];

      // Cotejo por referencia (FAC-XXXX en la glosa o referencia)
      const refMatch = [row.referencia, row.descripcion].some(v =>
        v && (v.toUpperCase().includes(inv.invoiceNumber.toUpperCase()) || v.toUpperCase().includes(inv.clientName.toUpperCase()))
      );

      // Cotejo por monto (±5%)
      const montoMatch = Math.abs(row.monto - inv.pendingAmount) / inv.pendingAmount < 0.05;

      if (refMatch || montoMatch) {
        bestMatch = { rowIdx: i, row };
        break;
      }
    }

    if (bestMatch) {
      usedBankRows.add(bestMatch.rowIdx);
      const diff = bestMatch.row.monto - inv.pendingAmount;
      results.push({
        invoice: inv,
        bankRow: bestMatch.row,
        matchStatus: Math.abs(diff) < 100 ? 'matched' : 'partial',
        difference: diff,
      });
    } else {
      results.push({ invoice: inv, matchStatus: 'unmatched', difference: -inv.pendingAmount });
    }
  }

  return results;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BillingValidatePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [bankRows, setBankRows] = useState<BankRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [bankName, setBankName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set()); // IDs ya conciliados
  const [overrideStatus, setOverrideStatus] = useState<Map<string, MatchStatus>>(new Map()); // ajustes manuales
  const [showUnpaid, setShowUnpaid] = useState(true);

  // Cargar facturas activas
  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const all = await repositories.invoices.getAll();
      const active = all.filter(i => i.status !== 'cancelled');
      setInvoices(active);
    } finally { setLoadingInvoices(false); }
  }, []);

  React.useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // Parsear Excel subido
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true); setParseError(''); setBankRows([]); setResults([]); setBankName('');
    setFileName(file.name);
    try {
      const { rows, bankName: detected } = await parseExcel(file);
      setBankRows(rows);
      setBankName(detected);
      // Hacer el cotejo automático
      const matched = match(invoices, rows);
      setResults(matched);
    } catch (err: unknown) {
      setParseError((err as Error).message ?? 'Error al parsear el archivo');
    } finally { setParsing(false); }
  };

  // Estadísticas del cotejo
  const stats = useMemo(() => {
    const matched = results.filter(r => r.matchStatus === 'matched').length;
    const partial = results.filter(r => r.matchStatus === 'partial').length;
    const unmatched = results.filter(r => r.matchStatus === 'unmatched').length;
    const totalBankAmount = bankRows.reduce((s, r) => s + r.monto, 0);
    return { matched, partial, unmatched, totalBankAmount };
  }, [results, bankRows]);

  // Confirmar conciliación de una factura
  const confirmReconcile = async (invId: string, row: BankRow | undefined) => {
    setConfirming(true);
    try {
      // Registrar el pago en la factura
      if (row && row.monto > 0) {
        const inv = invoices.find(i => i.id === invId);
        if (inv && inv.pendingAmount > 0) {
          const amountToApply = Math.min(row.monto, inv.pendingAmount);
          await repositories.invoices.registerPayment(invId, {
            invoiceId: invId,
            amount: amountToApply,
            method: 'transfer',
            reference: row.referencia || `Conciliación ${new Date().toLocaleDateString('es-CL')}`,
            paidAt: row.fecha instanceof Date ? row.fecha : new Date(),
            registeredBy: 'admin',
            notes: `Conciliado vía Excel · ${row.descripcion ?? ''}`.trim(),
          });
        }
        await repositories.invoices.update(invId, {
          reconciled: true,
          reconciledAt: new Date(),
          reconciledBy: 'admin',
        });
      }
      setConfirmed(prev => new Set(prev).add(invId));
      await loadInvoices();
    } finally { setConfirming(false); }
  };

  const confirmAll = async () => {
    const toConfirm = results.filter(r => r.matchStatus === 'matched' && !confirmed.has(r.invoice.id) && r.bankRow);
    for (const res of toConfirm) {
      await confirmReconcile(res.invoice.id, res.bankRow);
    }
  };

  const filteredResults = useMemo(() => {
    if (!showUnpaid) return results.filter(r => r.matchStatus !== 'already_paid');
    return results;
  }, [results, showUnpaid]);

  // Días de vencimiento para alertas
  const overdueInvoices = invoices.filter(i => effectiveStatus(i) === 'overdue');

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '13px', whiteSpace: 'nowrap' };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Validación de Pagos</h1>
          <p className="page-desc">Sube el archivo de pagos del banco y concilia automáticamente</p>
        </div>
        <div className="page-header-actions">
          <a href="/billing/prepare" className="btn btn-secondary btn-sm">📋 Preparar</a>
          <a href="/billing/charge" className="btn btn-secondary btn-sm">💳 Cobros</a>
          <button className="btn btn-ghost btn-sm" onClick={loadInvoices}>🔄</button>
        </div>
      </div>

      {/* Pasos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '12px', overflowX: 'auto' }}>
        {[
          { n: 1, label: 'Planificación', href: '/logistics' },
          { n: 2, label: 'Mantenimientos', href: '/maintenance' },
          { n: 3, label: 'Preparación', href: '/billing/prepare' },
          { n: 4, label: 'Cobro', href: '/billing/charge' },
          { n: 5, label: 'Validación', href: '/billing/validate', active: true },
        ].map((step, i, arr) => (
          <React.Fragment key={step.n}>
            <a href={step.href} style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: step.active ? 'var(--brand-500)' : 'var(--bg-surface)', color: step.active ? 'white' : 'var(--text-muted)', border: step.active ? 'none' : '1px solid var(--bg-border)', flexShrink: 0 }}>{step.n}</div>
              <span style={{ color: step.active ? 'var(--brand-400)' : 'var(--text-muted)', fontWeight: step.active ? 700 : 400 }}>{step.label}</span>
            </a>
            {i < arr.length - 1 && <span style={{ color: 'var(--bg-border)', flexShrink: 0 }}>→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Alertas de vencidos */}
      {overdueInvoices.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px', fontSize: '13px' }}>
          <div style={{ fontWeight: 700, color: 'var(--error-400)', marginBottom: '8px' }}>
            ⚠️ {overdueInvoices.length} factura{overdueInvoices.length !== 1 ? 's' : ''} vencida{overdueInvoices.length !== 1 ? 's' : ''} sin pago
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {overdueInvoices.slice(0, 5).map(inv => (
              <div key={inv.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-400)' }}>{inv.invoiceNumber}</span>
                <span>{inv.clientName}</span>
                <span style={{ color: 'var(--error-400)', fontWeight: 600 }}>{fmtCLP(inv.pendingAmount)}</span>
                <span className="text-muted">· {daysSince(inv.dueDate)} días vencida</span>
              </div>
            ))}
            {overdueInvoices.length > 5 && <div className="text-xs text-muted">+{overdueInvoices.length - 5} más...</div>}
          </div>
        </div>
      )}

      {/* Upload Excel */}
      <Card style={{ marginBottom: '20px' }}>
        <SectionHeader title="Archivo de pagos del banco" subtitle="Sube el Excel exportado desde tu banco (columnas: fecha, monto, referencia/glosa)" />
        <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={parsing || loadingInvoices}>
            {parsing ? '⏳ Procesando...' : '📁 Subir Excel de pagos'}
          </button>
          {fileName && (
            <span className="text-xs text-secondary">
              📄 {fileName} · {bankRows.length} abonos detectados
              {bankName && <span style={{ marginLeft: '6px', color: 'var(--brand-400)', fontWeight: 600 }}>· {bankName}</span>}
            </span>
          )}
          {parseError && <span style={{ fontSize: '12px', color: 'var(--error-400)' }}>⚠️ {parseError}</span>}
        </div>

        {/* Instrucciones del formato */}
        <div style={{ marginTop: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Formatos bancarios soportados (auto-detectados):</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>🏦 <strong>CuentaRUT BancoEstado</strong> — columnas: Fecha · N° Operación · Descripción · Depósitos / Abonos $</div>
            <div>🏦 <strong>Cuenta Vista (Banco Santander)</strong> — columnas: Fecha · Detalle · Monto cargo ($) · Monto abono ($) · Saldo ($)</div>
            <div>📊 <strong>Genérico</strong> — cualquier Excel con columnas fecha, monto/abono/importe, referencia/glosa</div>
          </div>
          <div style={{ marginTop: '6px' }}>El cotejo es automático: por número de factura en la glosa o por monto similar (±5%).</div>
        </div>
      </Card>

      {/* Resultados del cotejo */}
      {results.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
            <StatCard label="Coincidencias exactas" value={stats.matched} icon="✅" color="green" />
            <StatCard label="Coincidencias parciales" value={stats.partial} icon="⚠️" color="yellow" />
            <StatCard label="Sin coincidencia" value={stats.unmatched} icon="❌" color="red" />
            <StatCard label="Total en Excel" value={fmtCLP(stats.totalBankAmount)} icon="💵" color="cyan" />
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showUnpaid} onChange={e => setShowUnpaid(e.target.checked)} />
              Mostrar facturas ya pagadas
            </label>
            <button className="btn btn-primary btn-sm" disabled={confirming || stats.matched === 0} onClick={confirmAll}>
              {confirming ? '⏳ Conciliando...' : `✅ Conciliar ${stats.matched} factura${stats.matched !== 1 ? 's' : ''} coincidentes`}
            </button>
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                    {['Factura', 'Cliente', 'Pendiente', 'Excel (banco)', 'Diferencia', 'Estado factura', 'Cotejo', 'Acción'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map(res => {
                    const isConfirmed = confirmed.has(res.invoice.id);
                    const st = effectiveStatus(res.invoice);
                    const matchOverride = overrideStatus.get(res.invoice.id) ?? res.matchStatus;

                    const matchLabel: Record<MatchStatus, string> = {
                      matched: '✅ Coincide', partial: '⚠️ Parcial', unmatched: '❌ Sin coincidencia', already_paid: '💰 Ya pagado',
                    };
                    const matchColor: Record<MatchStatus, BadgeColor> = {
                      matched: 'green', partial: 'yellow', unmatched: 'red', already_paid: 'gray',
                    };

                    return (
                      <tr key={res.invoice.id} style={{ borderBottom: '1px solid var(--bg-border)', opacity: isConfirmed ? 0.6 : 1, background: isConfirmed ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-400)' }}>{res.invoice.invoiceNumber}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{res.invoice.clientName}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: res.invoice.pendingAmount > 0 ? 'var(--error-400)' : 'var(--text-muted)' }}>
                          {fmtCLP(res.invoice.pendingAmount)}
                          <div className="text-xs text-muted">Vence: {fmtDate(res.invoice.dueDate)}</div>
                          {st === 'overdue' && <div style={{ fontSize: '10px', color: 'var(--error-400)', fontWeight: 700 }}>+{daysSince(res.invoice.dueDate)}d</div>}
                        </td>
                        <td style={tdStyle}>
                          {res.bankRow ? (
                            <div>
                              <div style={{ fontWeight: 700 }}>{fmtCLP(res.bankRow.monto)}</div>
                              <div className="text-xs text-muted">{res.bankRow.referencia || res.bankRow.descripcion || '—'}</div>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td style={{ ...tdStyle, color: res.difference < -100 ? 'var(--error-400)' : res.difference > 100 ? 'var(--warning-500)' : 'var(--success-500)', fontWeight: 600 }}>
                          {res.bankRow ? (res.difference >= 0 ? '+' : '') + fmtCLP(res.difference) : '—'}
                        </td>
                        <td style={tdStyle}><Badge color={STATUS_COLORS[st]}>{STATUS_LABELS[st]}</Badge></td>
                        <td style={tdStyle}>
                          <Badge color={matchColor[matchOverride]}>{matchLabel[matchOverride]}</Badge>
                        </td>
                        <td style={tdStyle}>
                          {isConfirmed ? (
                            <span className="text-xs" style={{ color: 'var(--success-500)' }}>✅ Conciliado</span>
                          ) : matchOverride === 'matched' || matchOverride === 'partial' ? (
                            <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} disabled={confirming}
                              onClick={() => confirmReconcile(res.invoice.id, res.bankRow)}>
                              Confirmar
                            </button>
                          ) : matchOverride === 'unmatched' ? (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                              onClick={() => setOverrideStatus(prev => { const next = new Map(prev); next.set(res.invoice.id, 'partial'); return next; })}>
                              Marcar manual
                            </button>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Estado inicial: sin Excel subido */}
      {results.length === 0 && !parsing && invoices.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <SectionHeader title="Facturas activas" subtitle="Estado actual de las facturas pendientes de pago" />
          <div style={{ marginTop: '14px' }}>
            <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
              <StatCard label="Pendientes" value={invoices.filter(i => effectiveStatus(i) === 'pending').length} icon="⏳" color="yellow" />
              <StatCard label="Vencidas" value={overdueInvoices.length} icon="⚠️" color="red" />
              <StatCard label="Pago parcial" value={invoices.filter(i => i.status === 'partial').length} icon="💰" color="blue" />
              <StatCard label="Total por cobrar" value={fmtCLP(invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + i.pendingAmount, 0))} icon="💵" color="cyan" />
            </div>
            <EmptyState
              icon="📊"
              title="Sube el Excel del banco para cotejar"
              description="Exporta el informe de abonos/transferencias desde tu banco y súbelo para conciliar automáticamente con las facturas."
              action={<button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>📁 Subir Excel</button>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
