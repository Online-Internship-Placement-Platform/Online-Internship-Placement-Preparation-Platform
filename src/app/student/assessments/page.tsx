import { Suspense } from "react";
import { AssessmentsPageLoading } from "@/components/assessments-page-loading";
import { AssessmentsPage } from "@/components/role-pages";
import { requireAssessmentRole } from "@/lib/assessment-route-auth";

export default function StudentAssessmentsRoute() {
  return (
    <Suspense fallback={<AssessmentsPageLoading />}>
      <AuthorizedStudentAssessments />
    </Suspense>
  );
}

async function AuthorizedStudentAssessments() {
  await requireAssessmentRole(["student"]);
  return <AssessmentsPage role="student" />;
}
