import AdminQuestionBank from "@/components/admin-question-bank";
import type { Role } from "@/lib/placement-data";

export default function AdminAssessmentsView({
  role = "admin",
}: {
  role?: Extract<Role, "admin" | "super-admin">;
}) {
  return <AdminQuestionBank role={role} />;
}
