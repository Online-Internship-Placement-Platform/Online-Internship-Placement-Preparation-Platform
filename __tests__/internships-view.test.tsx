import { Suspense } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  resolvedIO: { then: (resolve: (value: undefined) => void) => resolve(undefined), status: "fulfilled", value: undefined },
  io: vi.fn(() => mocks.resolvedIO),
}));
vi.mock("next/cache", () => ({ io: mocks.io }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import InternshipsView from "@/components/internships-view";

const listing = (overrides: Record<string, unknown> = {}) => ({
  id: "internship-1", company: "Example Labs", role: "Engineer Intern", domain: "Software Development",
  applicationDeadline: "2030-06-30", minCgpa: 7, eligibleBranches: ["CS"], requiredSkills: ["TypeScript"],
  isOpen: true, eligibility: { eligible: true, status: "eligible", reasons: [] }, ...overrides,
});
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const renderView = (element: React.ReactNode) => render(<Suspense fallback={<p>Loading route</p>}>{element}</Suspense>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("student internship directory", () => {
  it("renders eligibility results, filters listings, and supports row navigation by mouse and keyboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      profile: { branch: "CS", cgpa: 8, complete: true },
      internships: [
        listing(),
        listing({ id: "design", company: "Design House", role: "Designer", domain: "Design", isOpen: false, requiredSkills: [], eligibleBranches: [], eligibility: { eligible: false, status: "ineligible", reasons: ["Branch does not match."] } }),
        listing({ id: "unclear", company: "Other", role: "Analyst", domain: "Business", eligibility: { eligible: false, status: "undetermined", reasons: [] } }),
      ],
    })));
    renderView(<InternshipsView />);
    expect(await screen.findByText("Profile: CS · 8 CGPA")).toBeTruthy();
    expect(screen.getByText("Eligible")).toBeTruthy();
    expect(screen.getByText("Not eligible")).toBeTruthy();
    expect(screen.getByText("Unable to determine")).toBeTruthy();
    const designerRow = screen.getByRole("link", { name: "View Designer at Design House" });
    const designerCells = designerRow.querySelectorAll("td");
    expect(designerCells[0].textContent).toContain("None listed");
    expect(designerCells[2].textContent).toContain("Not specified");

    fireEvent.change(screen.getByPlaceholderText("Search company, role, skill..."), { target: { value: "typescript" } });
    expect(screen.getByText("Engineer Intern")).toBeTruthy();
    expect(screen.queryByText("Designer")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Search company, role, skill..."), { target: { value: "" } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Design" } });
    expect(screen.getByText("Designer")).toBeTruthy();
    expect(screen.queryByText("Engineer Intern")).toBeNull();
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Closed" } });
    const row = screen.getByRole("link", { name: "View Designer at Design House" });
    fireEvent.click(row);
    expect(mocks.push).toHaveBeenLastCalledWith("/student/internships/design");
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "Escape" });
    expect(mocks.push).toHaveBeenCalledTimes(3);
  });

  it("renders incomplete profile and empty listing states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ profile: { branch: "", cgpa: 0, complete: false }, internships: [] })));
    renderView(<InternshipsView />);
    expect(await screen.findByText("Profile incomplete — add your branch and CGPA to check eligibility")).toBeTruthy();
    expect(screen.getByText("No published internships are available yet.")).toBeTruthy();
  });

  it("renders the error profile label and retries a failed request", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(response({ profile: null, internships: [] }));
    vi.stubGlobal("fetch", fetchMock);
    renderView(<InternshipsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Network unavailable");
    expect(screen.getByText("Profile check unavailable")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Profile unavailable")).toBeTruthy();
    expect(screen.getByText("No published internships are available yet.")).toBeTruthy();
  });

  it("shows server error text and filter empty state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: "Directory unavailable" }, false))
      .mockResolvedValueOnce(response({ internships: [listing()], profile: null }));
    vi.stubGlobal("fetch", fetchMock);
    renderView(<InternshipsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Directory unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Profile unavailable")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search company, role, skill..."), { target: { value: "missing" } });
    expect(screen.getByText("No internships match your filters.")).toBeTruthy();
  });

  it("does not fetch student data for an administrative role", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderView(<InternshipsView role="admin" />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Profile unavailable")).toBeTruthy();
    expect(screen.getByText("No published internships are available yet.")).toBeTruthy();
  });
});
