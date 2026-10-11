"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/roles";

type NavItem = { href: string; label: string };

function navItemsForRole(role: UserRole): NavItem[] {
  const base: NavItem[] = [
    { href: "/painel", label: "Início" },
    { href: "/painel/perfil", label: "Meu perfil" },
  ];

  if (role === "membro") {
    return [
      ...base,
      { href: "/painel/editais", label: "Meus editais" },
      { href: "/painel/corretores", label: "Corretores" },
      { href: "/painel/suporte", label: "Suporte" },
    ];
  }

  if (role === "corretor" || role === "admin") {
    const staff: NavItem[] = [
      ...base,
      { href: "/painel/correcoes", label: "Correções" },
      { href: "/painel/correcoes/corrigidas", label: "Corrigidas" },
      { href: "/painel/membros", label: "Membros" },
      { href: "/painel/suporte/atendimento", label: "Suporte" },
    ];
    if (role === "admin") {
      return [
        ...staff,
        { href: "/painel/admin/usuarios", label: "Usuários" },
        { href: "/painel/admin/editais", label: "Editais" },
        { href: "/painel/admin/kiwify", label: "Kiwify" },
      ];
    }
    return staff;
  }

  return base;
}

function isNavActive(pathname: string, href: string) {
  if (href === "/painel") {
    return pathname === "/painel";
  }
  if (href === "/painel/correcoes") {
    return pathname === "/painel/correcoes";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type PainelNavProps = {
  role: UserRole;
  className?: string;
};

export function PainelNav({ role, className = "" }: PainelNavProps) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav
      className={`flex min-w-0 flex-1 gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      aria-label="Navegação do painel"
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium leading-none transition ${
              active
                ? "bg-white/10 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
