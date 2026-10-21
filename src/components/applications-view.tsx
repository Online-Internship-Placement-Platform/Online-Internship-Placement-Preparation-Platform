"use client";

import Link from "next/link";
import { AppShell, StatusBadge } from "@/components/app-shell";
import {
  applications,
  currentStudent,
  formatDate,
  getInternship,
} from "@/lib/placement-data";

type ApplicationsViewProps = {
  role?: "student" | "admin" | "super-admin";
};

export default function ApplicationsView({ role = "student" }: ApplicationsViewProps) {
  const studentApplications = applications.filter(
    (application) => application.studentName === currentStudent.name,
  );

  return (
    <AppShell role={role} title="My applications" eyebrow="Student workspace">
      {studentApplications.length === 0 ? (
        <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center">
          <h2 className="font-semibold">You haven’t applied to any internships yet.</h2>
          <p className="mt-2 text-sm text-[#6e786f]">
            Browse available opportunities to find a role that fits your interests.
          </p>
          <Link
            href="/student/internships"
            className="mt-5 inline-flex rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]"
          >
            Browse internships
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e2e7e1] bg-white">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]">
              <tr>
                <th className="px-5 py-3">Opportunity</th>
                <th className="px-5 py-3">Applied on</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentApplications.map((application) => {
                const internship = getInternship(application.internshipId);

                return (
                  <tr className="border-b border-[#edf0ec] last:border-0" key={application.id}>
                    <td className="px-5 py-4 text-sm font-semibold">
                      {internship?.role ?? "Internship no longer available"}
                      {internship && (
                        <div className="mt-1 text-xs font-normal text-[#7b857c]">
                          {internship.company}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#6e786f]">
                      {formatDate(application.appliedOn)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={application.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
