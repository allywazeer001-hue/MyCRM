"use client";

export type ScopeAccess = "DENY" | "READ_ONLY" | "READ_WRITE";
export interface ScopeOption { key: string; label: string; }
export interface ScopeGrant { scopeKey: string; access: ScopeAccess; }

const LEVELS: { value: ScopeAccess; label: string }[] = [
  { value: "DENY", label: "Deny" },
  { value: "READ_ONLY", label: "Read Only" },
  { value: "READ_WRITE", label: "Read & Write" },
];

export function scopesToGrants(value: Record<string, ScopeAccess>): ScopeGrant[] {
  return Object.entries(value).map(([scopeKey, access]) => ({ scopeKey, access }));
}

export function grantsToMap(grants: ScopeGrant[]): Record<string, ScopeAccess> {
  const map: Record<string, ScopeAccess> = {};
  grants.forEach(g => { map[g.scopeKey] = g.access; });
  return map;
}

/** Shared Deny / Read Only / Read & Write matrix — used both in the Approve
 * dialog (setting initial grants) and the Permissions tab (editing them later). */
export function ScopeMatrix({
  options, value, onChange,
}: {
  options: ScopeOption[];
  value: Record<string, ScopeAccess>;
  onChange: (scopeKey: string, access: ScopeAccess) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-3 py-2 font-medium text-gray-600">Permission</th>
            {LEVELS.map(l => (
              <th key={l.value} className="text-center px-2 py-2 text-xs font-medium text-gray-600 whitespace-nowrap">
                {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {options.map(opt => {
            const current = value[opt.key] ?? "DENY";
            return (
              <tr key={opt.key} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{opt.label}</td>
                {LEVELS.map(l => (
                  <td key={l.value} className="text-center px-2 py-2">
                    <input
                      type="radio"
                      name={`scope-${opt.key}`}
                      checked={current === l.value}
                      onChange={() => onChange(opt.key, l.value)}
                      className="accent-blue-600 w-4 h-4"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
          {options.length === 0 && (
            <tr><td colSpan={LEVELS.length + 1} className="text-center py-6 text-gray-400 text-sm">No permission scopes available.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
