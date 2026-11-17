import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard-view", () => ({ default: () => <p>student dashboard view</p> }));
vi.mock("@/components/admin-dashboard-view", () => ({ default: ({ role }: { role: string }) => <p>admin dashboard {role}</p> }));
vi.mock("@/components/internships-view", () => ({ default: ({ role }: { role: string }) => <p>student internships {role}</p> }));
vi.mock("@/components/admin-internships-view", () => ({ default: ({ role }: { role: string }) => <p>admin internships {role}</p> }));
vi.mock("@/components/applications-view", () => ({ default: ({ role }: { role: string }) => <p>student applications {role}</p> }));
vi.mock("@/components/admin-applications-view", () => ({ default: ({ role }: { role: string }) => <p>admin applications {role}</p> }));
vi.mock("@/components/assessments-view", () => ({ default: ({ initialTests }: { initialTests: unknown[] }) => <p>student assessments {initialTests.length}</p> }));
vi.mock("@/components/admin-assessments-view", () => ({ default: ({ role }: { role: string }) => <p>admin assessments {role}</p> }));
vi.mock("@/components/profile-view", () => ({ ProfileView: ({ role }: { role: string }) => <p>profile {role}</p> }));
vi.mock("@/components/admin-student-directory-view", () => ({ default: ({ role }: { role: string }) => <p>directory {role}</p> }));

import {
  ApplicationsViewByRole, AssessmentsViewByRole, DashboardViewByRole,
  InternshipsViewByRole, ProfileViewByRole, StudentDirectoryViewByRole,
} from "@/components/role-pages";

afterEach(cleanup);

describe("shared role page dispatch", () => {
  it("selects the student or administrative dashboard and internship views by role", () => {
    const { rerender } = render(<DashboardViewByRole role="student" />);
    expect(screen.getByText("student dashboard view")).toBeTruthy();
    rerender(<DashboardViewByRole role="admin" />);
    expect(screen.getByText("admin dashboard admin")).toBeTruthy();
    rerender(<DashboardViewByRole role="super-admin" />);
    expect(screen.getByText("admin dashboard super-admin")).toBeTruthy();
    rerender(<InternshipsViewByRole role="student" />);
    expect(screen.getByText("student internships student")).toBeTruthy();
    rerender(<InternshipsViewByRole role="admin" />);
    expect(screen.getByText("admin internships admin")).toBeTruthy();
    rerender(<InternshipsViewByRole role="super-admin" />);
    expect(screen.getByText("admin internships super-admin")).toBeTruthy();
  });

  it("dispatches application, assessment and profile views for all roles", () => {
    const { rerender } = render(<ApplicationsViewByRole role="student" />);
    expect(screen.getByText("student applications student")).toBeTruthy();
    rerender(<ApplicationsViewByRole role="admin" />);
    expect(screen.getByText("admin applications admin")).toBeTruthy();
    rerender(<ApplicationsViewByRole role="super-admin" />);
    expect(screen.getByText("admin applications super-admin")).toBeTruthy();
    rerender(<AssessmentsViewByRole role="student" />);
    expect(screen.getByText("student assessments 0")).toBeTruthy();
    rerender(<AssessmentsViewByRole role="admin" />);
    expect(screen.getByText("admin assessments admin")).toBeTruthy();
    rerender(<AssessmentsViewByRole role="super-admin" />);
    expect(screen.getByText("admin assessments super-admin")).toBeTruthy();
    rerender(<ProfileViewByRole role="super-admin" />);
    expect(screen.getByText("profile super-admin")).toBeTruthy();
  });

  it("does not render a student directory for students and renders it for admin roles", () => {
    const { rerender } = render(<StudentDirectoryViewByRole role="student" />);
    expect(screen.queryByText(/directory/)).toBeNull();
    rerender(<StudentDirectoryViewByRole role="admin" />);
    expect(screen.getByText("directory admin")).toBeTruthy();
    rerender(<StudentDirectoryViewByRole role="super-admin" />);
    expect(screen.getByText("directory super-admin")).toBeTruthy();
  });
});
