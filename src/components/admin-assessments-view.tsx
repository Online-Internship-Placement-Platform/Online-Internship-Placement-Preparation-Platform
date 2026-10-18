import AssessmentsView from "@/components/assessments-view";

export default function AdminAssessmentsView({ role = "admin" }: { role?: "admin" | "super-admin" }) {
  return <AssessmentsView role={role} />;
}
