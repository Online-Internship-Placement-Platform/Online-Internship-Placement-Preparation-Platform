import { Suspense } from "react";
import { AssessmentsPageLoading } from "@/components/assessments-page-loading";
import { AssessmentsPage } from "@/components/role-pages";
import { requireAssessmentRole } from "@/lib/assessment-route-auth";

export default function AdminAssessmentsRoute() {
  return (
    <Suspense fallback={<AssessmentsPageLoading />}>
      <AuthorizedAdminAssessments />
    </Suspense>
  );
}

async function AuthorizedAdminAssessments() {
  const role = await requireAssessmentRole(["admin", "super-admin"]);
  return <AssessmentsPage role={role} />;
}
