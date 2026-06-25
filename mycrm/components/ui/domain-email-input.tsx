"use client";
import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface DomainEmailInputProps {
  value: string;
  onChange: (value: string) => void;
  domain?: string | null;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  suffix?: React.ReactNode;
  error?: string;
}

// Shared style constants — must be identical on both the display layer and the input
const SHARED: React.CSSProperties = {
  fontSize:      14,
  fontFamily:    "inherit",
  letterSpacing: "inherit",
  lineHeight:    "1",
  whiteSpace:    "pre",
  padding:       "0 14px",
};

export function DomainEmailInput({
  value, onChange, domain, placeholder = "jane@example.com",
  disabled, required, className, id, autoFocus, suffix, error,
}: DomainEmailInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Compute ghost suffix
  const atIdx     = value.indexOf("@");
  const afterAt   = atIdx !== -1 ? value.slice(atIdx + 1) : null;
  const ghost     =
    domain && atIdx !== -1 && afterAt !== null &&
    domain.toLowerCase().startsWith(afterAt.toLowerCase()) &&
    afterAt.length < domain.length
      ? domain.slice(afterAt.length)
      : "";

  function accept() {
    if (ghost && domain) {
      const full = value.slice(0, atIdx + 1) + domain;
      onChange(full);
      requestAnimationFrame(() => {
        const inp = inputRef.current;
        if (inp) { inp.focus(); inp.setSelectionRange(full.length, full.length); }
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (ghost && (e.key === "Tab" || e.key === "Enter" || e.key === "ArrowRight")) {
      e.preventDefault();
      accept();
    }
  }

  const borderColor = error
    ? "#fca5a5"
    : focused
      ? "#6b7280"
      : "#e5e7eb";

  const showPlaceholder = !value && !focused;

  return (
    <div className={cn("relative w-full", className)}>
      {/* ── Outer shell — provides background + border ── */}
      <div
        className="relative flex items-center overflow-hidden rounded-xl transition-all duration-150"
        style={{
          height:     44,
          background: "white",
          border:     `1.5px solid ${borderColor}`,
          boxShadow:  focused ? "0 0 0 3px rgba(107,114,128,0.08)" : "none",
          opacity:    disabled ? 0.5 : 1,
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* ── Display layer: placeholder / typed text / ghost ── */}
        <div
          aria-hidden
          className="absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden"
        >
          {showPlaceholder ? (
            <span style={{ ...SHARED, color: "#d1d5db", whiteSpace: "nowrap" }}>
              {placeholder}
            </span>
          ) : (
            <span style={{ ...SHARED, display: "flex", alignItems: "center" }}>
              {/* Typed portion */}
              <span style={{ color: "#111827" }}>{value}</span>
              {/* Ghost suggestion */}
              {ghost && (
                <span style={{ color: "#9ca3af" }}>{ghost}</span>
              )}
            </span>
          )}
        </div>

        {/* ── Real input: invisible text, visible caret ── */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="email"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          disabled={disabled}
          required={required}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...SHARED,
            position:    "absolute",
            inset:       0,
            width:       "100%",
            height:      "100%",
            border:      "none",
            outline:     "none",
            background:  "transparent",
            // Text invisible — only the caret shows
            color:       "transparent",
            caretColor:  "#374151",
            cursor:      "text",
            paddingRight: suffix ? 36 : 14,
          }}
        />

        {/* ── Right suffix (spinner, etc.) ── */}
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {suffix}
          </div>
        )}
      </div>

      {/* ── Hint shown while ghost is active ── */}
      {ghost && focused && (
        <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
          Press
          <kbd className="inline-flex items-center px-1 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-mono text-gray-500">Tab</kbd>
          or
          <kbd className="inline-flex items-center px-1 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-mono text-gray-500">→</kbd>
          to complete
        </p>
      )}
    </div>
  );
}
