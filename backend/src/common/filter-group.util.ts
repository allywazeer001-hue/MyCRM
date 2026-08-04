/**
 * Shared record-filter engine — the exact logic that used to live only as
 * private methods on RecordsService (applyFilterGroup/applyCondition).
 * Extracted so Campaigns' audience-filter mode can reuse the identical
 * `{ logic: "AND"|"OR", conditions: [...], groups: [...] }` shape instead of
 * duplicating it. This is a different, simpler shape than the Workflow
 * condition-tree (`type`/`operator`/`children` in mycrm/lib/condition-tree.ts)
 * — do not confuse the two.
 */
export function applyFilterGroup(data: any, group: any): boolean {
  const results: boolean[] = [
    ...group.conditions.map((c: any) => applyCondition(data, c)),
    ...(group.groups || []).map((g: any) => applyFilterGroup(data, g)),
  ];
  if (results.length === 0) return true;
  return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export function applyCondition(data: any, c: any): boolean {
  const raw = data?.[c.field];
  const val = raw ?? '';
  const cv = c.value ?? '';

  switch (c.operator) {
    case 'is':           return Array.isArray(raw) ? raw.map(String).includes(String(cv)) : String(val) === String(cv);
    case 'is_not':       return Array.isArray(raw) ? !raw.map(String).includes(String(cv)) : String(val) !== String(cv);
    case 'contains':     return String(val).toLowerCase().includes(String(cv).toLowerCase());
    case 'not_contains': return !String(val).toLowerCase().includes(String(cv).toLowerCase());
    case 'starts_with':  return String(val).toLowerCase().startsWith(String(cv).toLowerCase());
    case 'ends_with':    return String(val).toLowerCase().endsWith(String(cv).toLowerCase());
    case 'empty':        return !raw || raw === '' || (Array.isArray(raw) && raw.length === 0);
    case 'not_empty':    return !!raw && raw !== '' && !(Array.isArray(raw) && raw.length === 0);
    case 'eq':           return Number(val) === Number(cv);
    case 'neq':          return Number(val) !== Number(cv);
    case 'lt':           return Number(val) < Number(cv);
    case 'lte':          return Number(val) <= Number(cv);
    case 'gt':           return Number(val) > Number(cv);
    case 'gte':          return Number(val) >= Number(cv);
    case 'between':      return Number(val) >= Number(cv) && Number(val) <= Number(c.value2);
    case 'today':        { const d = new Date(); const v = new Date(val); return v.toDateString() === d.toDateString(); }
    case 'yesterday':    { const d = new Date(); d.setDate(d.getDate() - 1); return new Date(val).toDateString() === d.toDateString(); }
    case 'this_week':    { const now = new Date(); const ws = new Date(now); ws.setDate(now.getDate() - now.getDay()); return new Date(val) >= ws && new Date(val) <= now; }
    case 'this_month':   { const now = new Date(); const d = new Date(val); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
    case 'last_month':   { const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const d = new Date(val); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
    case 'date_between': { const d = new Date(val); return d >= new Date(cv) && d <= new Date(c.value2); }
    default:             return true;
  }
}
