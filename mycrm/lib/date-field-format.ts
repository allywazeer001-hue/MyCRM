// Shared date/time precision helpers for DATE and DATETIME fields.
//
// A field's `settings` JSON can carry:
//   datePrecision: "full" | "month" | "year"   — how much of the date is user-editable/shown
//   timeFormat:    "24h" | "12h"                — display only; native <input type="time">
//                                                  renders per OS locale, which we can't override,
//                                                  so this only controls read-only display strings.
//
// The stored value is always kept as a normal ISO date/datetime string regardless of precision —
// "year" precision just normalizes to Jan 1 of that year, "month" to the 1st of that month — so no
// backend/schema changes are needed and existing full-precision data keeps working unchanged.

export type DatePrecision = "full" | "month" | "year";
export type TimeFormat = "24h" | "12h";

export interface DateFieldFormatSettings {
  datePrecision: DatePrecision;
  timeFormat: TimeFormat;
}

function parseSettings(raw: any): any {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

export function getDateFieldFormatSettings(field: { settings?: any } | null | undefined): DateFieldFormatSettings {
  const s = parseSettings(field?.settings);
  const datePrecision: DatePrecision = s.datePrecision === "month" || s.datePrecision === "year" ? s.datePrecision : "full";
  const timeFormat: TimeFormat = s.timeFormat === "12h" ? "12h" : "24h";
  return { datePrecision, timeFormat };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

// ── Stored-value <-> input-value conversions ──────────────────────────────────

export function dateValueToYear(value: unknown): string {
  const d = toDate(value);
  return d ? String(d.getFullYear()) : "";
}

export function yearToDateValue(year: string): string {
  return year ? `${year}-01-01` : "";
}

export function dateValueToMonthInput(value: unknown): string {
  const d = toDate(value);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
}

export function monthInputToDateValue(monthStr: string): string {
  return monthStr ? `${monthStr}-01` : "";
}

// ── Read-only display formatting ──────────────────────────────────────────────

export function formatDateFieldValue(
  value: unknown,
  field: { type?: string; settings?: any } | null | undefined
): string {
  const d = toDate(value);
  if (!d) return "";
  const { datePrecision, timeFormat } = getDateFieldFormatSettings(field);

  let datePart: string;
  if (datePrecision === "year") {
    datePart = String(d.getFullYear());
  } else if (datePrecision === "month") {
    datePart = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } else {
    datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (field?.type !== "DATETIME") return datePart;

  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });
  return `${datePart}, ${timePart}`;
}
