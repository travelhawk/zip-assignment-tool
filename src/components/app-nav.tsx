"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

function linkClass() {
  return [
    "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium",
    "bg-white/70 text-[var(--foreground)] hover:bg-white",
  ].join(" ");
}

export function AppNav({ isAdmin, isSuperAdmin }: AppNavProps) {
  const pathname = usePathname();

  const links = [
    pathname === "/" ? null : { href: "/", label: "Zur Suche" },
    isAdmin && pathname !== "/admin" ? { href: "/admin", label: "Import" } : null,
    isSuperAdmin && pathname !== "/analytics"
      ? { href: "/analytics", label: "Analytics" }
      : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={linkClass()}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
