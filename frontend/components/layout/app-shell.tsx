"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { DataFreshness } from "@/components/layout/data-freshness";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ensureSession, logout } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chamados", label: "Chamados" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    ensureSession().then((ok) => {
      if (!ok) router.replace("/login");
    });
  }, [router]);

  const links = isAdmin
    ? [...baseLinks, { href: "/usuarios", label: "Usuários" }]
    : baseLinks;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo />
            <div className="hidden border-l border-border pl-4 sm:block">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Prefeitura do Rio</p>
              <h1 className="text-base font-semibold">Pequenos Cariocas</h1>
              <DataFreshness className="mt-1 text-xs text-muted-foreground" />
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user.name} · {user.role}
              </span>
            ) : null}
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <div className="border-b border-border bg-muted/30 px-4 py-2 sm:hidden">
        <DataFreshness className="text-xs text-muted-foreground" />
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
