import { Suspense } from "react";
import { AssessmentsPageLoading } from "@/components/assessments-page-loading";
import { AssessmentsPage } from "@/components/role-pages";
import { requireAssessmentRole } from "@/lib/assessment-route-auth";

export default function SuperAdminAssessmentsRoute() {
  return (
    <Suspense fallback={<AssessmentsPageLoading />}>
      <AuthorizedSuperAdminAssessments />
    </Suspense>
  );
}

async function AuthorizedSuperAdminAssessments() {
  await requireAssessmentRole(["super-admin"]);
  return <AssessmentsPage role="super-admin" />;
}
