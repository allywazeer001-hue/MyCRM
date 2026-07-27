"use client";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  getDateFieldFormatSettings,
  dateValueToYear,
  yearToDateValue,
  dateValueToMonthInput,
  monthInputToDateValue,
} from "@/lib/date-field-format";

// Renders the right input for a DATE/DATETIME field's configured precision:
//   "year"  -> searchable dropdown of years
//   "month" -> native month picker (captures month + year, nothing finer)
//   "full"  -> the usual date/datetime-local input
// The stored value is always normalized to a full date string (see lib/date-field-format),
// so callers don't need to branch on precision themselves — just render this and pass
// the raw stored value through.
export function DateFieldInput({
  field,
  value,
  onChange,
  disabled,
  readOnly,
  className,
}: {
  field: { type?: string; settings?: any };
  value: any;
  onChange: (v: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}) {
  const { datePrecision } = getDateFieldFormatSettings(field);
  const isDisabled = disabled || readOnly;

  if (datePrecision === "year") {
    const now = new Date().getFullYear();
    const options = [];
    for (let y = now + 20; y >= now - 100; y--) options.push({ value: String(y), label: String(y) });
    return (
      <Combobox
        options={options}
        value={dateValueToYear(value)}
        onChange={y => onChange(yearToDateValue(y))}
        placeholder="--select--"
        searchPlaceholder="Search year…"
        className={className}
        disabled={isDisabled}
      />
    );
  }

  if (datePrecision === "month") {
    return (
      <Input
        type="month"
        value={dateValueToMonthInput(value)}
        onChange={e => onChange(monthInputToDateValue(e.target.value))}
        disabled={disabled}
        readOnly={readOnly}
        className={className}
      />
    );
  }

  // Full precision — time-of-day display format (12h/24h) is left to the browser/OS for the
  // native input itself (there's no reliable cross-browser way to force it); the configured
  // timeFormat setting only affects read-only display via formatDateFieldValue.
  if (field.type === "DATETIME") {
    return (
      <Input
        type="datetime-local"
        value={value ? String(value).replace("Z", "").slice(0, 16) : ""}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        className={className}
      />
    );
  }

  return (
    <Input
      type="date"
      value={value ? String(value).split("T")[0] : ""}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    />
  );
}
