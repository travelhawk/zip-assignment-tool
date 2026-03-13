"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  isAdmin: boolean;
};

function linkClass() {
  return [
    "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium",
    "bg-white/70 text-[var(--foreground)] hover:bg-white",
  ].join(" ");
}

export function AppNav({ isAdmin }: AppNavProps) {
  const pathname = usePathname();

  if (!isAdmin) {
    return null;
  }

  return pathname === "/admin" ? (
    <Link href="/" className={linkClass()}>
      Zur Suche
    </Link>
  ) : (
    <Link href="/admin" className={linkClass()}>
      Import
    </Link>
  );
}
