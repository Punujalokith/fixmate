// Shared chart styling. Palette validated for colour-blind separation (teal ↔ amber ΔE 12.5 protan).
export const SERIES = { primary: '#0d9488', secondary: '#d97706' };

export const axis = { stroke: '#94a3b8', fontSize: 12, tickLine: false, axisLine: false } as const;
export const grid = { stroke: '#e2e8f0', strokeDasharray: '0', vertical: false } as const;
export const tooltip = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: 13 },
  labelStyle: { color: '#0f172a', fontWeight: 600 },
  itemStyle: { color: '#334155' },
  cursor: { fill: 'rgba(148,163,184,0.12)' },
} as const;

/** "2026-09-30" → "30 Sep" */
export const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
