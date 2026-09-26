"use client";
import type { ReactNode } from "react";

export function Modal({ title, kicker, children, actions, wide = false }: { title: string; kicker?: string; children: ReactNode; actions: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-root fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3 fade-in" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[92vh] overflow-auto scroll-thin rounded-2xl bg-panel border border-line shadow-2xl`}>
        <div className="p-5">
          {kicker && <div className="text-[11px] uppercase tracking-wide text-muted">{kicker}</div>}
          <h2 className="text-xl font-semibold mt-0.5">{title}</h2>
          <div className="mt-3 text-sm leading-relaxed text-ink/95">{children}</div>
        </div>
        <div className="px-5 pb-5 flex flex-wrap gap-2 justify-end">{actions}</div>
      </div>
    </div>
  );
}

export function Btn({ children, onClick, primary = false, disabled = false }: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${primary ? "bg-accent text-bg hover:brightness-110" : "border border-line text-ink hover:border-accent"}`}
    >
      {children}
    </button>
  );
}
