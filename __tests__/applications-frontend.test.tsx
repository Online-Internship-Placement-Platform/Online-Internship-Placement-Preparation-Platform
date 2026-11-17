import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  SectionHeading: ({ title }: { title: string }) => <h2>{title}</h2>,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import ApplicationsView from "@/components/applications-view";
import AdminApplicationsView from "@/components/admin-applications-view";
import { InternshipDetail } from "@/components/internship-detail";

const internship = {
  id: "internship-1", company: "Example Labs", role: "Engineer Intern", domain: "Engineering",
  stipendPerMonth: 20000, type: "hybrid" as const, location: "Bengaluru", description: "Build software.",
  applicationDeadline: "2030-06-30", minCgpa: 7, eligibleBranches: ["Computer Science"], requiredSkills: ["TypeScript"],
};

const availability = (overrides: Record<string, unknown> = {}) => ({
  internship, canApply: true, isOpen: true, alreadyApplied: false,
  eligibilityChecks: [
    { criterion: "CGPA", eligible: true, reasons: [] },
    { criterion: "Branch", eligible: true, reasons: [] },
  ],
  student: { name: "Alex Student", email: "alex@example.test", branch: "Computer Science", cgpa: 8.5 },
  ...overrides,
});

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("student application views", () => {
  it("renders application history and filters by status and search text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ applications: [
      { id: 1, status: "Pending", appliedAt: "2030-01-01", resumeUrl: null, deadlineStatus: "Open", deadlineMessage: "Plenty of time", internship: { id: "one", company: "Example Labs", role: "Engineer", applicationDeadline: "2030-06-30" } },
      { id: 2, status: "Accepted", appliedAt: "2030-02-01", resumeUrl: "/resume.pdf", deadlineStatus: "Closing soon", deadlineMessage: "Closing soon", internship: { id: "two", company: "Other Co", role: "Designer", applicationDeadline: "2030-03-30" } },
    ] })));
    render(<ApplicationsView />);

    expect(await screen.findByRole("region", { name: "Application history" })).toBeTruthy();
    expect(screen.getByText("Engineer")).toBeTruthy();
    expect(screen.getByText("Download PDF")).toBeTruthy();
    expect(screen.getByText("Not attached")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "Accepted" } });
    expect(screen.getByText("Designer")).toBeTruthy();
    expect(screen.queryByText("Engineer")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search applications"), { target: { value: "missing" } });
    expect(screen.getByText("No applications match these filters.")).toBeTruthy();
  });

  it("shows empty and API error states", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ applications: [] }))
      .mockResolvedValueOnce(response({ error: "Applications unavailable" }, false));
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<ApplicationsView />);
    expect(await screen.findByText("You haven’t applied to any internships yet.")).toBeTruthy();
    first.unmount();
    render(<ApplicationsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Applications unavailable");
  });

  it("uses fallback response data and supports deadline and oldest sorting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ applications: [
      { id: 1, status: "", appliedAt: "2030-02-01", resumeUrl: null, deadlineStatus: "Closed", deadlineMessage: "Closed", internship: { id: "one", company: "Later Co", role: "Later", applicationDeadline: "2030-08-30" } },
      { id: 2, status: "Pending", appliedAt: "2030-01-01", resumeUrl: null, deadlineStatus: "Open", deadlineMessage: "Open", internship: { id: "two", company: "Soon Co", role: "Soon", applicationDeadline: "2030-03-30" } },
    ] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ApplicationsView />);
    expect(await screen.findByText("Unknown")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Sort applications"), { target: { value: "deadline" } });
    expect(screen.getAllByRole("row")[1].textContent).toContain("Soon");
    fireEvent.change(screen.getByLabelText("Sort applications"), { target: { value: "oldest" } });
    expect(screen.getAllByRole("row")[1].textContent).toContain("Soon");
  });

  it("falls back for a non-Error load failure and missing applications", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({}, false))
      .mockRejectedValueOnce("network failure")
      .mockResolvedValueOnce(response({}));
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<ApplicationsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Could not load your applications.");
    first.unmount();
    const second = render(<ApplicationsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Could not load your applications.");
    second.unmount();
    render(<ApplicationsView />);
    expect(await screen.findByText("You haven’t applied to any internships yet.")).toBeTruthy();
  });
});

describe("admin application review", () => {
  const application = {
    id: 41, status: "Pending", appliedAt: "2030-01-01", student: { name: "Jamie Student", skills: ["SQL"] },
    internship: { id: "internship-1", company: "Example Labs", role: "Engineer Intern" }, resumeUrl: null,
  };

  it("filters applications and confirms a successful status update", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ applications: [application], internships: [{ id: "internship-1", company: "Example Labs", role: "Engineer Intern" }] }))
      .mockResolvedValueOnce(response({ applications: [application], internships: [] }))
      .mockResolvedValueOnce(response({ application: { id: 41, status: "Accepted" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminApplicationsView />);

    expect(await screen.findByText("Jamie Student")).toBeTruthy();
    expect(screen.getByText("SQL")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Student name"), { target: { value: "Jamie" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("studentName=Jamie"), expect.anything()));
    fireEvent.change(screen.getByLabelText("New status for Jamie Student"), { target: { value: "Accepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("status")).textContent).toContain("Status updated to Accepted.");
  });

  it("reports an unsuccessful update", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ applications: [application], internships: [] }))
      .mockResolvedValueOnce(response({ error: "Write rejected" }, false));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminApplicationsView />);
    expect(await screen.findByText("Jamie Student")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New status for Jamie Student"), { target: { value: "Rejected" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Write rejected");
  });

  it("retries after an application load failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: "Temporary load error" }, false))
      .mockResolvedValueOnce(response({ applications: [], internships: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminApplicationsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Temporary load error");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No applications have been submitted yet.")).toBeTruthy();
  });

  it("shows the unfiltered empty state and clears all selected filters", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue(response({ applications: [], internships: [{ id: "internship-1", company: "Example Labs", role: "Engineer Intern" }] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminApplicationsView />);
    expect(await screen.findByText("No applications have been submitted yet.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Student name"), { target: { value: "Jamie" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText("Internship"), { target: { value: "internship-1" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Under review" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(screen.getByText("No applications have been submitted yet.")).toBeTruthy();
  });

  it("rejects unconfirmed server updates and defaults missing error messages", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ applications: [application], internships: [] }))
      .mockResolvedValueOnce(response({}));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminApplicationsView />);
    expect(await screen.findByText("Jamie Student")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New status for Jamie Student"), { target: { value: "Accepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("The server did not confirm the application update.");
  });

  it("uses empty defaults for absent result collections and fallback for unknown load errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({}))
      .mockRejectedValueOnce("unexpected failure");
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<AdminApplicationsView />);
    expect(await screen.findByText("No applications have been submitted yet.")).toBeTruthy();
    first.unmount();
    render(<AdminApplicationsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Could not load applications.");
  });
});

describe("internship application detail", () => {
  it("validates an uploaded resume, submits an application, and shows its status and resume", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(availability({ profileResumeAvailable: true })))
      .mockResolvedValueOnce(response({ application: { status: "Pending" }, resumeUrl: "/submitted-resume.pdf" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<InternshipDetail id="internship / 1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Apply now" }));
    const input = screen.getByLabelText("Upload resume (PDF)") as HTMLInputElement;
    expect(screen.getByText(/A profile resume is available/)).toBeTruthy();
    fireEvent.change(input, { target: { files: [new File(["not pdf"], "resume.txt", { type: "text/plain" })] } });
    expect((await screen.findByRole("alert")).textContent).toContain("Resume must be a PDF file.");
    fireEvent.change(input, { target: { files: [new File(["pdf data"], "resume.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
    expect(await screen.findByText(/Application submitted successfully/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View submitted resume" }).getAttribute("href")).toBe("/submitted-resume.pdf");
    const post = fetchMock.mock.calls[1][1] as RequestInit;
    expect(post.method).toBe("POST");
    expect(post.body).toBeInstanceOf(FormData);
  });

  it("shows ineligibility and duplicate application states", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(availability({ canApply: false, reason: "CGPA is below the minimum.", eligibilityChecks: [{ criterion: "CGPA", eligible: false, reasons: ["Increase your CGPA."] }, { criterion: "Branch", eligible: true, reasons: [] }] })))
      .mockResolvedValueOnce(response(availability({ canApply: false, alreadyApplied: true, applicationStatus: "Under Review" })));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<InternshipDetail id="internship-1" />);
    expect((await screen.findByRole("button", { name: "Not eligible" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("CGPA is below the minimum.")).toBeTruthy();
    unmount();
    render(<InternshipDetail id="internship-1" />);
    expect((await screen.findByText(/You have already applied/)).textContent).toContain("Under Review");
  });

  it("shows an availability error, then exposes the closed application reason", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce(response(availability({ canApply: false, isOpen: false, reason: "The deadline has passed." })));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<InternshipDetail id="internship-1" />);
    expect(await screen.findByText("Request failed")).toBeTruthy();
    unmount();
    render(<InternshipDetail id="internship-1" />);
    expect((await screen.findByRole("button", { name: "Applications closed" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("The deadline has passed.")).toBeTruthy();
  });

  it("covers resume size, empty-file, optional-data and cancelled form states", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(availability({
      student: { name: null, email: "student@example.test", branch: null, cgpa: null },
      eligibilityChecks: undefined,
      internship: { ...internship, description: "", type: "on-site", location: null, requiredSkills: [], eligibleBranches: [] },
    })));
    vi.stubGlobal("fetch", fetchMock);
    render(<InternshipDetail id="internship-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Apply now" }));
    expect(screen.getByText("No description has been added yet.")).toBeTruthy();
    expect(screen.getByText("Location").parentElement?.textContent).toContain("Not provided");
    expect(screen.getByText(/Student · student@example.test/)).toBeTruthy();
    const input = screen.getByLabelText("Upload resume (PDF)") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([], "empty.pdf", { type: "application/pdf" })] } });
    expect((await screen.findByRole("alert")).textContent).toContain("Choose a non-empty PDF file.");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })] } });
    expect((await screen.findByRole("alert")).textContent).toContain("Resume must be 5 MB or smaller.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Apply now" })).toBeTruthy();
  });

  it("shows submit errors, handles missing confirmation fields, and catches network failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(availability()))
      .mockResolvedValueOnce(response({ error: "Application closed" }, false))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response(availability()))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<InternshipDetail id="internship-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Apply now" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Application closed");
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
    expect((await screen.findByText(/Application submitted successfully/)).textContent).toContain("Pending");
    // Remount for an independent network exception path.
    cleanup();
    render(<InternshipDetail id="internship-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Apply now" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server.");
  });

  it("uses availability and submit fallbacks when the server omits error messages", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({}, false))
      .mockResolvedValueOnce(response(availability()))
      .mockResolvedValueOnce(response({}, false));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<InternshipDetail id="internship-1" />);
    expect(await screen.findByText("Could not check application availability.")).toBeTruthy();
    unmount();
    render(<InternshipDetail id="internship-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Apply now" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
    expect((await screen.findByRole("alert")).textContent).toContain("We could not submit your application.");
  });
});
