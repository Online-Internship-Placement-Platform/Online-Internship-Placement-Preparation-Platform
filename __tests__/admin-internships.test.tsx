import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/components/app-shell", async () => {
  const actual = await vi.importActual<typeof import("@/components/app-shell")>("@/components/app-shell");
  return {
    ...actual,
    AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  };
});

import AdminInternshipsView from "@/components/admin-internships-view";
import AdminInternshipDetail from "@/components/admin-internship-detail";

const internship = {
  id: "internship-1",
  company: "Example Labs",
  role: "Frontend Intern",
  domain: "Software Development",
  stipendPerMonth: 15000,
  type: "hybrid" as const,
  location: "Pune",
  description: "Build product features with the engineering team.",
  applicationDeadline: "2030-06-30",
  minCgpa: 7.5,
  eligibleBranches: ["Computer Science"],
  requiredSkills: ["React", "TypeScript"],
  published: false,
  acceptingApplications: false,
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("admin internship management UI", () => {
  it("navigates to the detail page when an admin clicks a listing row", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ internships: [internship] }));

    render(<AdminInternshipsView role="admin" />);

    const rowLink = await screen.findByRole("link", { name: "View Frontend Intern at Example Labs" });
    fireEvent.click(within(rowLink).getByText("Software Development"));

    expect(push).toHaveBeenCalledWith("/admin/internships/internship-1");
  });

  it("does not create an internship with an empty description", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ internships: [] }));

    render(<AdminInternshipsView />);
    fireEvent.click(screen.getByRole("button", { name: "+ Create internship" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Company" }), { target: { value: "Example Labs" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Role" }), { target: { value: "Frontend Intern" } });
    fireEvent.change(screen.getByLabelText("Application deadline"), { target: { value: "2030-06-30" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Eligible branches" }), { target: { value: "Computer Science" } });
    fireEvent.click(screen.getByRole("button", { name: "Save internship" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Description is required.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends all new fields when creating an internship", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ internships: [] }))
      .mockResolvedValueOnce(jsonResponse({ internship: { ...internship, published: true } }));

    render(<AdminInternshipsView />);
    fireEvent.click(screen.getByRole("button", { name: "+ Create internship" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Company" }), { target: { value: internship.company } });
    fireEvent.change(screen.getByRole("textbox", { name: "Role" }), { target: { value: internship.role } });
    fireEvent.change(screen.getByLabelText("Monthly stipend"), { target: { value: "15000" } });
    fireEvent.change(screen.getByLabelText("Work type"), { target: { value: "hybrid" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Pune" } });
    fireEvent.change(screen.getByLabelText("Application deadline"), { target: { value: internship.applicationDeadline } });
    fireEvent.change(screen.getByLabelText("Minimum CGPA"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Eligible branches" }), { target: { value: "Computer Science" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), { target: { value: internship.description } });
    fireEvent.change(screen.getByRole("textbox", { name: "Required skills" }), { target: { value: "React\nTypeScript" } });
    fireEvent.click(screen.getByRole("button", { name: "Save internship" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/internships", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: internship.company,
        role: internship.role,
        domain: internship.domain,
        stipendPerMonth: 15000,
        type: "hybrid",
        location: "Pune",
        description: internship.description,
        applicationDeadline: internship.applicationDeadline,
        minCgpa: 7.5,
        eligibleBranches: "Computer Science",
        requiredSkills: "React\nTypeScript",
        published: false,
        acceptingApplications: false,
      }),
    }));
  });

  it("loads and saves edits from the admin detail view", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ internship }))
      .mockResolvedValueOnce(jsonResponse({ internship: { ...internship, role: "Updated Frontend Intern", description: "Updated description." } }));

    render(<AdminInternshipDetail id={internship.id} role="super-admin" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit internship" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), { target: { value: "Updated description." } });
    fireEvent.change(screen.getByRole("textbox", { name: "Role" }), { target: { value: "Updated Frontend Intern" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin/internships/internship-1", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"description":"Updated description."'),
    })));
    expect(await screen.findByRole("heading", { name: "Updated Frontend Intern" })).toBeDefined();
  });

  it("does not save a detail edit with a whitespace-only description", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(jsonResponse({ internship }));

    render(<AdminInternshipDetail id={internship.id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit internship" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), { target: { value: "   \n  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Description is required.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});