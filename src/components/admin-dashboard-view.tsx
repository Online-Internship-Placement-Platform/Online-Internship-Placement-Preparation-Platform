import Link from "next/link";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell, SectionHeading, StatusBadge } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES, type Role } from "@/lib/placement-data";
import { getServerSession } from "@/lib/server-session";

type AdminRole = Extract<Role, "admin" | "super-admin">;

const formatCount = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(date);

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function AdminDashboardView({ role }: { role: AdminRole }) {
  await io();
  const session = await getServerSession();
  if (!session || session.role !== role) redirect("/login");

  let dashboardData;
  try {
    const today = startOfTodayUtc();
    const pendingStatuses = APPLICATION_STATUSES.filter(
      (status) => status === "Pending" || status === "Under review",
    );
    dashboardData = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.internship.count({
        where: {
          published: true,
          acceptingApplications: true,
          applicationDeadline: { gte: today },
        },
      }),
      prisma.application.count(),
      prisma.application.count({ where: { status: { in: [...pendingStatuses] } } }),
      prisma.application.findMany({
        orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          studentId: true,
          status: true,
          appliedAt: true,
          student: { select: { name: true } },
          internship: { select: { role: true, company: true } },
        },
      }),
      prisma.internship.findMany({
        where: {
          published: true,
          acceptingApplications: true,
          applicationDeadline: { gte: today },
        },
        orderBy: [{ applicationDeadline: "asc" }, { company: "asc" }],
        take: 4,
        select: { id: true, company: true, role: true, applicationDeadline: true },
      }),
    ]);
  } catch (error) {
    console.error("Could not load the administrative dashboard.", error);
    return (
      <AppShell role={role} title="Placement overview" eyebrow="Administration">
        <p role="alert" className="rounded-xl border border-[#e2e7e1] bg-white p-5 text-sm text-[#6e786f]">
          Dashboard data is temporarily unavailable. Please refresh and try again.
        </p>
      </AppShell>
    );
  }

  const [studentCount, activeInternshipCount, applicationCount, pendingDecisionCount, recentApplications, upcomingDeadlines] = dashboardData;
  const internshipHref = role === "admin" ? "/admin/internships" : "/super-admin/internships";
  const applicationsHref = role === "admin" ? "/admin/applications" : "/super-admin/applications";

  return (
    <AppShell role={role} title="Placement overview" eyebrow="Administration">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-[#6e786f]">A clear view of your campus placement pipeline.</p>
        <Link href={internshipHref} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white">
          Manage internships <span className="ml-3" aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total students" value={studentCount} note="Student accounts" />
        <Metric label="Active internships" value={activeInternshipCount} note="Published and accepting applications" />
        <Metric label="Total applications" value={applicationCount} note="All stored applications" />
        <Metric label="Pending decisions" value={pendingDecisionCount} note="Pending or under review" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section>
          <SectionHeading title="Recent applications" action={<Link href={applicationsHref} className="text-xs font-semibold text-[#176b50]">View all →</Link>} />
          {recentApplications.length ? (
            <div className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]">
                    <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Internship</th><th className="px-5 py-3">Applied</th><th className="px-5 py-3">Status</th></tr>
                  </thead>
                  <tbody>{recentApplications.map((application) => (
                    <tr key={application.id} className="border-b border-[#edf0ec] last:border-0">
                      <td className="px-5 py-4 text-sm font-semibold">{application.student.name?.trim() || `Student #${application.studentId}`}</td>
                      <td className="px-5 py-4 text-xs text-[#5e6b61]"><div className="font-semibold">{application.internship.role}</div><div className="mt-1 text-[#7b857c]">{application.internship.company}</div></td>
                      <td className="px-5 py-4 text-xs text-[#6e786f]">{formatDate(application.appliedAt)}</td>
                      <td className="px-5 py-4"><StatusBadge status={application.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ) : <EmptyState>No applications have been submitted yet.</EmptyState>}
        </section>

        <section>
          <SectionHeading title="Upcoming deadlines" />
          {upcomingDeadlines.length ? (
            <div className="space-y-3">{upcomingDeadlines.map((internship) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e2e7e1] bg-white p-4" key={internship.id}>
                <div><div className="text-sm font-semibold">{internship.company}</div><div className="mt-1 text-xs text-[#7b857c]">{internship.role}</div></div>
                <div className="shrink-0 text-right text-xs font-semibold text-[#a86618]">{formatDate(internship.applicationDeadline)}</div>
              </div>
            ))}</div>
          ) : <EmptyState>No published internships have an upcoming application deadline.</EmptyState>}
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl border border-[#e2e7e1] bg-white p-5">
      <div className="mb-4 text-xs text-[#6e786f]">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{formatCount(value)}</div>
      <div className="mt-2 text-xs text-[#7b857c]">{note}</div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#e2e7e1] bg-white p-5 text-sm text-[#7b857c]">{children}</div>;
}
