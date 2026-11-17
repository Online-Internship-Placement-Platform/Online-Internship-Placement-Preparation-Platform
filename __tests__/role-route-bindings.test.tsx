import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/role-pages", () => {
  const view = (name: string) => function RoleView({ role }: { role: string }) {
    return <div data-testid="route-target">{name}:{role}</div>;
  };
  return {
    DashboardPage: view("dashboard"),
    InternshipsPage: view("internships"),
    ApplicationsPage: view("applications"),
    AssessmentsPage: view("assessments"),
    ProfileViewByRole: view("profile"),
    StudentDirectoryViewByRole: view("directory"),
    ApplicationsViewByRole: view("applications"),
    InternshipsViewByRole: view("internships"),
    DashboardViewByRole: view("dashboard"),
    AssessmentsViewByRole: view("assessments"),
  };
});

import AdminApplicationsRoute from "@/app/admin/applications/page";
import AdminDashboardRoute from "@/app/admin/dashboard/page";
import AdminInternshipsRoute from "@/app/admin/internships/page";
import AdminProfileRoute from "@/app/admin/profile/page";
import AdminStudentDirectoryRoute from "@/app/admin/student-directory/page";
import StudentApplicationsRoute from "@/app/student/applications/page";
import StudentDashboardRoute from "@/app/student/dashboard/page";
import StudentInternshipsRoute from "@/app/student/internships/page";
import StudentProfileRoute from "@/app/student/profile/page";
import SuperAdminApplicationsRoute from "@/app/super-admin/applications/page";
import SuperAdminDashboardRoute from "@/app/super-admin/dashboard/page";
import SuperAdminInternshipsRoute from "@/app/super-admin/internships/page";
import SuperAdminProfileRoute from "@/app/super-admin/profile/page";
import SuperAdminStudentDirectoryRoute from "@/app/super-admin/student-directory/page";

afterEach(cleanup);

describe("role route bindings", () => {
  it.each([
    ["student dashboard", StudentDashboardRoute, "dashboard:student"],
    ["student internships", StudentInternshipsRoute, "internships:student"],
    ["student applications", StudentApplicationsRoute, "applications:student"],
    ["student profile", StudentProfileRoute, "profile:student"],
    ["admin dashboard", AdminDashboardRoute, "dashboard:admin"],
    ["admin internships", AdminInternshipsRoute, "internships:admin"],
    ["admin applications", AdminApplicationsRoute, "applications:admin"],
    ["admin profile", AdminProfileRoute, "profile:admin"],
    ["admin student directory", AdminStudentDirectoryRoute, "directory:admin"],
    ["super-admin dashboard", SuperAdminDashboardRoute, "dashboard:super-admin"],
    ["super-admin internships", SuperAdminInternshipsRoute, "internships:super-admin"],
    ["super-admin applications", SuperAdminApplicationsRoute, "applications:super-admin"],
    ["super-admin profile", SuperAdminProfileRoute, "profile:super-admin"],
    ["super-admin student directory", SuperAdminStudentDirectoryRoute, "directory:super-admin"],
  ])("binds %s to its canonical role", (_label, Route: React.ComponentType, expected) => {
    render(<Route />);
    expect(screen.getByTestId("route-target").textContent).toBe(expected);
  });
});
