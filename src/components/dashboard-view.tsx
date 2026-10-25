import Link from "next/link";
import { AppShell, SectionHeading, StatusBadge } from "@/components/app-shell";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

const profileFields = ["name", "email", "branch", "cgpa", "year", "skills"] as const;
const today = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);

export default async function StudentDashboard() {
  const session = await getServerSession();
  if (!session || session.role !== "student") {
    return <AppShell title="Student dashboard" eyebrow="Student workspace"><p role="alert" className="text-sm text-[#6e786f]">Your student session could not be verified. Please sign in again.</p></AppShell>;
  }

  try {
    const [student, applications, internships] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, name: true, email: true, branch: true, cgpa: true, year: true, skills: true } }),
      prisma.application.findMany({
        where: { studentId: session.userId }, orderBy: { appliedAt: "desc" },
        select: { id: true, status: true, appliedAt: true, internship: { select: { role: true, company: true } } },
      }),
      prisma.internship.findMany({
        where: { published: true, applicationDeadline: { gte: today() } }, orderBy: { applicationDeadline: "asc" }, take: 3,
        select: { id: true, role: true, company: true, applicationDeadline: true, requiredSkills: true },
      }),
    ]);
    if (!student || student.role !== "student") throw new Error("Student profile not found");

    const skills = student.skills.split("\n").map((skill) => skill.trim()).filter(Boolean);
    const completed = [student.name, student.email, student.branch, student.cgpa, student.year, skills.length ? skills : null].filter((field) => field !== null && field !== undefined && field !== "").length;
    const completion = Math.round(completed / profileFields.length * 100);
    const outstanding = profileFields.length - completed;
    const firstName = student.name?.trim().split(/\s+/)[0] || "there";
    const shortlisted = applications.filter((application) => application.status.toLowerCase() === "shortlisted").length;

    return <AppShell title={`Good morning, ${firstName}`} eyebrow="Student workspace" identityName={student.name || student.email}>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="max-w-xl text-sm leading-6 text-[#6e786f]">Keep your profile sharp and stay ahead of the next placement opportunity.</p></div><Link href="/student/internships" className="inline-flex w-fit items-center rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#12563f]">Browse internships <span className="ml-3">→</span></Link></div>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Link href="/student/profile" className="rounded-xl border border-[#e2e7e1] bg-white p-5 transition-shadow hover:shadow-md"><Metric label="Profile completion" value={`${completion}%`} note={`${outstanding} ${outstanding === 1 ? "field" : "fields"} to complete`} progress={completion} /></Link>
        <Link href="/student/applications" className="rounded-xl border border-[#e2e7e1] bg-white p-5 transition-shadow hover:shadow-md"><Metric label="Applications" value={String(applications.length)} note={`${shortlisted} shortlisted`} /></Link>
        <Link href="/student/assessments" className="rounded-xl border border-[#e2e7e1] bg-white p-5 transition-shadow hover:shadow-md"><Metric label="Assessment average" value="—" note="No assessment results available" /></Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]"><section><SectionHeading title="Recent applications" action={<Link href="/student/applications" className="text-xs font-semibold text-[#176b50]">View all →</Link>} />
        {applications.length ? <div className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white"><table className="w-full text-left"><thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Applied</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody>{applications.slice(0, 3).map((application) => <tr key={application.id} className="border-b border-[#edf0ec] last:border-0"><td className="px-5 py-4"><div className="text-sm font-semibold">{application.internship.role}</div><div className="mt-1 text-xs text-[#7b857c]">{application.internship.company}</div></td><td className="px-5 py-4 text-xs text-[#6e786f]">{formatDate(application.appliedAt)}</td><td className="px-5 py-4"><StatusBadge status={application.status} /></td></tr>)}</tbody></table></div> : <EmptyState> You have not applied to any internships yet.</EmptyState>}
      </section><section><SectionHeading title="Preparation snapshot" /><div className="rounded-xl border border-[#e2e7e1] bg-white p-5"><p className="text-sm font-semibold">No preparation score yet</p><p className="mt-2 text-xs leading-5 text-[#7b857c]">Assessment results are not available in the current system, so a readiness score cannot be calculated.</p><Link href="/student/assessments" className="mt-4 inline-flex text-xs font-semibold text-[#176b50]">Go to assessments →</Link></div></section></div>
      <section className="mt-8"><SectionHeading title="Deadlines worth noting" action={<Link href="/student/internships" className="text-xs font-semibold text-[#176b50]">Explore directory →</Link>} />
        {internships.length ? <div className="grid gap-4 md:grid-cols-3">{internships.map((item) => <Link href={`/student/internships/${item.id}`} key={item.id} className="rounded-xl border border-[#e2e7e1] bg-white p-5 transition-shadow hover:shadow-md"><div className="mb-6 flex items-start justify-between"><span className="rounded-md bg-[#f1f3ef] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#69736b]">Internship</span><span className="text-xs font-semibold text-[#a86618]">{formatDate(item.applicationDeadline)}</span></div><div className="text-sm font-semibold">{item.role}</div><div className="mt-1 text-xs text-[#7b857c]">{item.company}</div><div className="mt-5 flex flex-wrap gap-1.5">{item.requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 3).map((skill) => <span className="rounded border border-[#e2e7e1] px-2 py-1 text-[10px] text-[#6e786f]" key={skill}>{skill}</span>)}</div></Link>)}</div> : <EmptyState>There are no published internships with upcoming deadlines.</EmptyState>}
      </section>
    </AppShell>;
  } catch (error) {
    console.error("Could not load the student dashboard.", error);
    return <AppShell title="Student dashboard" eyebrow="Student workspace"><p role="alert" className="rounded-xl border border-[#e2e7e1] bg-white p-5 text-sm text-[#6e786f]">Your dashboard is temporarily unavailable. Please refresh and try again.</p></AppShell>;
  }
}

function Metric({ label, value, note, progress }: { label: string; value: string; note: string; progress?: number }) {
  return <div><div className="mb-3 flex items-start justify-between"><span className="text-xs text-[#6e786f]">{label}</span><span aria-hidden="true" className="text-xs text-[#176b50]">↗</span></div><div className="text-2xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-[#7b857c]">{note}</div>{progress !== undefined && <div className="mt-4 h-1 rounded-full bg-[#edf0ec]"><div className="h-1 rounded-full bg-[#176b50]" style={{ width: `${progress}%` }} /></div>}</div>;
}

function EmptyState({ children }: { children: React.ReactNode }) { return <div className="rounded-xl border border-[#e2e7e1] bg-white p-5 text-sm text-[#7b857c]">{children}</div>; }
