"use client";
import { Star } from "lucide-react";
import { DependentGlobalListInput, GlobalListInput } from "@/components/ui/dependent-global-list-input";

export interface PortalFieldDef {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  options: Array<{ id?: string; label: string; value: string }>;
  isRequired: boolean;
  isVisible: boolean;
  isEditable: boolean;
  isReadOnly: boolean;
  isAdminOnly: boolean;
  formula?: string;
  settings?: Record<string, any>;
}

interface Props {
  field: PortalFieldDef;
  value: any;
  onChange?: (value: any) => void;
  readOnly?: boolean;
  externalOptions?: Array<{ label: string; value: string }>;
}

const INPUT = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";

function Empty() {
  return <span className="text-gray-400 italic text-sm">Not set</span>;
}

export function PortalFieldRenderer({ field, value, onChange, readOnly, externalOptions }: Props) {
  if (!field.isVisible) return null;

  // ── Structural / layout field types ──────────────────────────────────────────
  switch (field.fieldType) {
    case "header":
      return (
        <div className="pt-2 pb-1">
          <h3 className="text-base font-semibold text-gray-800">{field.label}</h3>
          {field.helpText && <p className="text-xs text-gray-500 mt-0.5">{field.helpText}</p>}
        </div>
      );

    case "label":
      return (
        <div className="py-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
            {field.label}
          </span>
          {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
        </div>
      );

    case "separator":
    case "divider":
      return (
        <div className="py-2">
          {field.label ? (
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400 font-medium shrink-0">{field.label}</span>
              <hr className="flex-1 border-gray-200" />
            </div>
          ) : (
            <hr className="border-gray-200" />
          )}
        </div>
      );

    case "spacer":
      return <div className="py-3" />;
  }

  const editing = !readOnly && field.isEditable && !field.isReadOnly;

  // ── Data field types ──────────────────────────────────────────────────────────
  switch (field.fieldType) {
    case "boolean":
      if (!editing) {
        return <span className={`text-sm font-medium ${value ? "text-green-600" : "text-gray-400"}`}>{value ? "Yes" : "No"}</span>;
      }
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={e => onChange?.(e.target.checked)}
            className="rounded accent-indigo-500 w-4 h-4" />
          <span className="text-sm text-gray-700">{value ? "Yes" : "No"}</span>
        </label>
      );

    case "textarea":
      if (!editing) return value ? <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p> : <Empty />;
      return (
        <textarea className={INPUT + " min-h-[80px] resize-y"} value={value ?? ""}
          onChange={e => onChange?.(e.target.value)} placeholder={field.placeholder} />
      );

    case "number":
      if (!editing) return value != null ? <span className="text-sm text-gray-800">{value}</span> : <Empty />;
      return (
        <input type="number" className={INPUT} value={value ?? ""}
          onChange={e => onChange?.(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={field.placeholder} />
      );

    case "currency":
      if (!editing) {
        return value != null
          ? <span className="text-sm text-gray-800 font-medium">${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          : <Empty />;
      }
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input type="number" step="0.01" className={INPUT + " pl-7"} value={value ?? ""}
            onChange={e => onChange?.(e.target.value === "" ? null : Number(e.target.value))}
            placeholder="0.00" />
        </div>
      );

    case "phone":
      if (!editing) return value ? <a href={`tel:${value}`} className="text-sm text-indigo-600 hover:underline">{value}</a> : <Empty />;
      return (
        <input type="tel" className={INPUT} value={value ?? ""}
          onChange={e => onChange?.(e.target.value)} placeholder={field.placeholder ?? "e.g. +1 555 123 4567"} />
      );

    case "email":
      if (!editing) return value
        ? <a href={`mailto:${value}`} className="text-sm text-indigo-600 hover:underline">{value}</a>
        : <Empty />;
      return (
        <input type="email" className={INPUT} value={value ?? ""}
          onChange={e => onChange?.(e.target.value)} placeholder={field.placeholder ?? "email@example.com"} />
      );

    case "date":
      if (!editing) return value ? <span className="text-sm text-gray-800">{new Date(value).toLocaleDateString()}</span> : <Empty />;
      return <input type="date" className={INPUT} value={value ?? ""} onChange={e => onChange?.(e.target.value)} />;

    case "datetime":
      if (!editing) return value ? <span className="text-sm text-gray-800">{new Date(value).toLocaleString()}</span> : <Empty />;
      return <input type="datetime-local" className={INPUT} value={value ?? ""} onChange={e => onChange?.(e.target.value)} />;

    case "rating": {
      const rating = Number(value) || 0;
      if (!editing) {
        return (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            ))}
            {rating > 0 && <span className="text-xs text-gray-500 ml-1">{rating}/5</span>}
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} type="button" onClick={() => onChange?.(i + 1)}
              className={`p-0.5 transition-colors ${i < rating ? "text-amber-400 hover:text-amber-500" : "text-gray-300 hover:text-amber-300"}`}>
              <Star className={`w-5 h-5 ${i < rating ? "fill-amber-400" : ""}`} />
            </button>
          ))}
          {rating > 0 && (
            <button type="button" onClick={() => onChange?.(0)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Clear</button>
          )}
        </div>
      );
    }

    case "dropdown": {
      const opt = field.options?.find(o => o.value === value);
      if (!editing) {
        return opt
          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{opt.label}</span>
          : (value ? <span className="text-sm text-gray-800">{value}</span> : <Empty />);
      }
      return (
        <select className={INPUT} value={value ?? ""} onChange={e => onChange?.(e.target.value)}>
          <option value="">— Select —</option>
          {field.options.map((o, i) => <option key={o.id ?? `${o.value}-${i}`} value={o.value}>{o.label}</option>)}
        </select>
      );
    }

    case "multiselect": {
      const selected: string[] = Array.isArray(value) ? value : [];
      if (!editing) {
        return selected.length > 0
          ? (
            <div className="flex flex-wrap gap-1">
              {selected.map(v => {
                const o = field.options.find(x => x.value === v);
                return <span key={v} className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-medium">{o?.label ?? v}</span>;
              })}
            </div>
          )
          : <Empty />;
      }
      return (
        <div className="space-y-1.5">
          {field.options.map((o, i) => (
            <label key={o.id ?? `${o.value}-${i}`} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={selected.includes(o.value)}
                onChange={e => {
                  const next = e.target.checked ? [...selected, o.value] : selected.filter(v => v !== o.value);
                  onChange?.(next);
                }}
                className="rounded accent-indigo-500" />
              {o.label}
            </label>
          ))}
        </div>
      );
    }

    case "lookup":
      if (!editing) {
        return value
          ? <span className="text-sm text-indigo-600 font-medium">{String(value)}</span>
          : <Empty />;
      }
      return (
        <input type="text" className={INPUT} value={value ?? ""}
          onChange={e => onChange?.(e.target.value)}
          placeholder={field.placeholder ?? "Search or enter ID..."} />
      );

    case "formula":
      return <span className="text-sm text-gray-500 italic font-mono">{value ?? "—"}</span>;

    case "table": {
      const rows: any[] = Array.isArray(value) ? value : [];
      return (
        <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
          {rows.length === 0 ? (
            <div className="p-3 text-gray-400 italic text-center text-xs">No data</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(rows[0]).map(k => (
                    <th key={k} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.values(row).map((v: any, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700">{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }

    case "upload":
      return <span className="text-sm text-gray-400 italic">Use the Documents section to upload files.</span>;

    case "GLOBAL_LIST":
    case "GLOBAL_RELATION": {
      const listId = field.settings?.globalListId ?? field.settings?.globalListSource?.listId ?? "";
      if (!editing) {
        if (externalOptions) {
          const opt = externalOptions.find(o => o.value === value);
          return opt
            ? <span className="text-sm text-gray-800">{opt.label}</span>
            : (value ? <span className="text-sm text-gray-800">{String(value)}</span> : <Empty />);
        }
        return value ? <span className="text-sm text-gray-800">{String(value)}</span> : <Empty />;
      }
      if (externalOptions) {
        return (
          <select className={INPUT} value={value ?? ""} onChange={e => onChange?.(e.target.value)}>
            <option value="">— Select —</option>
            {externalOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      }
      return (
        <GlobalListInput
          listId={listId}
          value={value ?? ""}
          onChange={(v: string) => onChange?.(v)}
          placeholder={field.placeholder}
        />
      );
    }

    case "DEPENDENT_GLOBAL_LIST": {
      const listId = field.settings?.globalListId ?? field.settings?.globalListSource?.listId ?? "";
      if (!editing) {
        return value ? <span className="text-sm text-gray-800">{String(value)}</span> : <Empty />;
      }
      return (
        <DependentGlobalListInput
          listId={listId}
          value={value ?? ""}
          onChange={(v: any) => onChange?.(v)}
          placeholder={field.placeholder}
        />
      );
    }

    default:
      if (!editing) return value ? <span className="text-sm text-gray-800">{String(value)}</span> : <Empty />;
      return (
        <input type="text" className={INPUT} value={value ?? ""}
          onChange={e => onChange?.(e.target.value)} placeholder={field.placeholder} />
      );
  }
}

// ── Convenience component for portal pages using a dependency hook ────────────
interface GlobalListSelectProps {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function GlobalListSelect({ options, value, onChange, placeholder, disabled, className }: GlobalListSelectProps) {
  return (
    <select
      className={className ?? INPUT}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">— {placeholder ?? "Select"} —</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
