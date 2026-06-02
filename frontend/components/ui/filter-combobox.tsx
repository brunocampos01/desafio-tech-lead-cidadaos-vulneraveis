"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterComboboxProps {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export function FilterCombobox({
  label,
  value,
  options,
  onChange,
  loading = false,
  placeholder = "Buscar...",
}: FilterComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
    setSearch("");
  }

  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        {label}
        {loading ? <Loader2 className="h-3 w-3 animate-spin opacity-70" aria-hidden /> : null}
      </span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-border bg-card px-2 text-left text-sm text-foreground",
            loading && "opacity-70",
          )}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          disabled={loading}
        >
          <span className="truncate">{value || "Todos"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
        {open ? (
          <div
            className="absolute z-50 mt-1 max-h-56 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg"
            role="listbox"
            id={listId}
          >
            <div className="border-b border-border p-2">
              <Input
                type="search"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="h-8 text-sm"
              />
            </div>
            <ul className="max-h-40 overflow-y-auto py-1 text-sm">
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-muted"
                  onClick={() => select("")}
                >
                  Todos
                </button>
              </li>
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-muted-foreground">Nenhuma opção</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt}>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-3 py-1.5 text-left hover:bg-muted",
                        value === opt && "bg-primary/10 font-medium text-primary",
                      )}
                      onClick={() => select(opt)}
                    >
                      {opt}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </label>
  );
}
