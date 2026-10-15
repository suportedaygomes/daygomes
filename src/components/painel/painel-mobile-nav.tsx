"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/roles";
import { isNavActive, navItemsForRole } from "@/components/painel/painel-nav";

type Props = {
  role: UserRole;
};

export function PainelMobileNav({ role }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navItemsForRole(role);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] text-foreground lg:hidden"
        aria-expanded={open}
        aria-controls="painel-mobile-menu"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? "Fechar" : "Menu"}</span>
        <svg
          aria-hidden
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {open ? (
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          <nav
            id="painel-mobile-menu"
            className="absolute left-0 right-0 top-0 max-h-[min(85dvh,32rem)] overflow-y-auto border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-modal)] shadow-xl"
            style={{
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingLeft: "max(1rem, env(safe-area-inset-left))",
              paddingRight: "max(1rem, env(safe-area-inset-right))",
            }}
            onClick={(event) => event.stopPropagation()}
            aria-label="Menu do painel"
          >
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
              Navegação
            </p>
            <ul className="flex flex-col gap-1 pb-4">
              {items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-11 items-center rounded-xl px-4 text-base font-medium transition ${
                        active
                          ? "bg-purple/15 text-foreground"
                          : "text-muted hover:bg-white/5 hover:text-foreground"
                      }`}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
