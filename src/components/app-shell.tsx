"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/placement-data";
import { AUTH_STORAGE_KEY } from "@/lib/auth";

const navItems: Record<Role, { label: string; href: string }[]> = {
  student: [{ label: "Overview", href: "/student/dashboard" }, { label: "Internships", href: "/student/internships" }, { label: "Applications", href: "/student/applications" }, { label: "Assessments", href: "/student/assessments" }],
  admin: [{ label: "Overview", href: "/admin/dashboard" }, { label: "Internships", href: "/admin/internships" }, { label: "Applications", href: "/admin/applications" }, { label: "Assessments", href: "/admin/assessments" }],
  "super-admin": [{ label: "Overview", href: "/super-admin/dashboard" }, { label: "Internships", href: "/super-admin/internships" }, { label: "Applications", href: "/super-admin/applications" }, { label: "Assessments", href: "/super-admin/assessments" }],
};
const roleNames: Record<Role, string> = { student: "Student", admin: "Admin", "super-admin": "Super Admin" };
const home: Record<Role, string> = { student: "/student/dashboard", admin: "/admin/dashboard", "super-admin": "/super-admin/dashboard" };

export function AppShell({ children, role = "student", title, eyebrow }: { children: ReactNode; role?: Role; title: string; eyebrow?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const active = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!active || active !== role) { router.replace("/login"); return; }
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, [role, router]);
  if (!ready) return <div className="min-h-screen bg-[var(--background)]" aria-label="Loading" />;
  const logout = () => { window.sessionStorage.removeItem(AUTH_STORAGE_KEY); router.replace("/login"); };
  return <div className="min-h-screen bg-[#f5f6f2] text-[#17211b] lg:flex">
    <aside className="flex w-full shrink-0 flex-col border-b border-[#e2e7e1] bg-[#fbfcfa] px-5 py-5 lg:min-h-screen lg:w-[238px] lg:border-b-0 lg:border-r lg:px-4">
      <Link href={home[role]} className="mb-8 flex items-center gap-3 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176b50] text-sm font-bold text-white">IP</span><span><span className="block text-sm font-bold tracking-tight">InPlace</span><span className="block text-[10px] uppercase tracking-[0.14em] text-[#7b857c]">Placement hub</span></span></Link>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa49b]">{role === "student" ? "Student workspace" : "Administration"}</div>
      <nav className="flex gap-1 overflow-x-auto lg:block">{navItems[role].map((item) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-[#e6f2ec] font-semibold text-[#176b50]" : "text-[#657067] hover:bg-[#f0f3ef] hover:text-[#17211b]"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#176b50]" : "bg-[#c8d0c9]"}`} />{item.label}</Link>; })}</nav>
      <div className="mt-auto hidden border-t border-[#e2e7e1] pt-4 lg:block"><div className="mb-4 flex items-center gap-3 px-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dcebe2] text-xs font-bold text-[#176b50]">{role === "student" ? "AM" : role === "admin" ? "ND" : "SA"}</div><div><div className="text-xs font-semibold">{role === "student" ? "Aarav Mehta" : role === "admin" ? "Nisha Desai" : "Super Admin"}</div><div className="text-[11px] text-[#7b857c]">{roleNames[role]}</div></div></div><button onClick={logout} className="w-full rounded-lg border border-[#e2e7e1] px-3 py-2 text-xs font-semibold text-[#657067] hover:bg-[#f0f3ef]">Log out</button></div>
    </aside>
    <main className="min-w-0 flex-1"><header className="flex items-center justify-between border-b border-[#e2e7e1] bg-[#fbfcfa] px-6 py-5 lg:px-10"><div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa49b]">{eyebrow}</div><h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1></div><div className="hidden items-center gap-3 sm:flex"><span className="rounded-lg border border-[#e2e7e1] bg-white px-3 py-2 text-xs text-[#657067]">October 18, 2026</span><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcebe2] text-xs font-bold text-[#176b50]">{role === "student" ? "AM" : role === "admin" ? "ND" : "SA"}</div></div></header><div className="p-6 lg:p-10">{children}</div></main>
  </div>;
}
export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) { return <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold tracking-tight">{title}</h2>{action}</div>; }
export function StatusBadge({ status }: { status: string }) { const tone = status === "Open" || status === "Shortlisted" ? "bg-[#e6f2ec] text-[#176b50]" : status === "Closed" || status === "Rejected" ? "bg-[#fcedeb] text-[#b94b48]" : "bg-[#fff4df] text-[#a86618]"; return <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${tone}`}>{status}</span>; }
