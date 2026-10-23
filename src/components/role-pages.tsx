import type { Role } from "@/lib/placement-data";
import DashboardView from "@/components/dashboard-view";
import AdminDashboardView from "@/components/admin-dashboard-view";
import InternshipsView from "@/components/internships-view";
import AdminInternshipsView from "@/components/admin-internships-view";
import ApplicationsView from "@/components/applications-view";
import AdminApplicationsView from "@/components/admin-applications-view";
import AssessmentsView from "@/components/assessments-view";
import AdminAssessmentsView from "@/components/admin-assessments-view";

export function DashboardViewByRole({ role }: { role: Role }) {
  return role === "student" ? <DashboardView /> : <AdminDashboardView role={role} />;
}

export function InternshipsViewByRole({ role }: { role: Role }) {
  return role === "student" ? <InternshipsView role={role} /> : <AdminInternshipsView role={role} />;
}

export function ApplicationsViewByRole({ role }: { role: Role }) {
  return role === "student" ? <ApplicationsView role={role} /> : <AdminApplicationsView role={role} />;
}

// AssessmentsViewByRole is synchronous — the student domain picker fetches
// tests client-side after the user selects a domain, so no server-side
// pre-fetch is needed here.
export function AssessmentsViewByRole({ role }: { role: Role }) {
  if (role !== "student") return <AdminAssessmentsView role={role} />;
  return <AssessmentsView initialTests={[]} />;
}

export const DashboardPage = DashboardViewByRole;
export const InternshipsPage = InternshipsViewByRole;
export const ApplicationsPage = ApplicationsViewByRole;
export const AssessmentsPage = AssessmentsViewByRole;
