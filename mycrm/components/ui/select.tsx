"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// ── Search helpers ────────────────────────────────────────────────────────────

function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!React.isValidElement(node)) return "";
  const kids = (node.props as any).children;
  if (Array.isArray(kids)) return kids.map(getTextContent).join(" ");
  return getTextContent(kids);
}

// Recursively filter SelectItem elements by query.
// Groups/Labels are kept only when they contain at least one matching item.
function filterSelectItems(children: React.ReactNode, q: string): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const props = child.props as any;

    // SelectItem — identified by having a `value` prop
    if (props.value !== undefined) {
      return getTextContent(props.children).toLowerCase().includes(q) ? child : null;
    }

    // Container (group, etc.) — recurse; drop if no matching items inside
    if (props.children) {
      const filtered = filterSelectItems(props.children, q);
      const hasMatch = countItems(filtered) > 0;
      if (!hasMatch) return null;
      return React.cloneElement(child as React.ReactElement<any>, { children: filtered });
    }

    return child;
  });
}

function countItems(children: React.ReactNode): number {
  let n = 0;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as any;
    if (props.value !== undefined) { n++; return; }
    if (props.children) n += countItems(props.children);
  });
  return n;
}

// ── SelectContent ─────────────────────────────────────────────────────────────

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus the search input after Radix finishes its own focus-scope setup.
  // requestAnimationFrame defers one frame so we win the focus race.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const displayed = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? filterSelectItems(children, q) : children;
  }, [children, search]);

  const hasResults = !search.trim() || countItems(displayed) > 0;

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-md data-[state=open]:animate-in",
          className
        )}
        position={position}
        {...props}
      >
        {/* Search bar */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            // Stop key events from reaching Radix's keyboard navigation (except Escape to close)
            onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation(); }}
          />
          {search && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSearch("")}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable item list */}
        <SelectPrimitive.Viewport className="p-1 max-h-60 overflow-y-auto">
          {displayed}
          {!hasResults && (
            <div className="py-4 text-center text-xs text-gray-400">No results</div>
          )}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

// ── Rest of primitives (unchanged) ───────────────────────────────────────────

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("px-2 py-1.5 text-xs font-semibold text-gray-500", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-gray-100", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator };
