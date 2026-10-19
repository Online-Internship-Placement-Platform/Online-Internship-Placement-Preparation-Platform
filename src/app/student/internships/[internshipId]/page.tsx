import { InternshipDetail } from "@/components/internship-detail";

export default async function StudentInternshipDetailRoute({
  params,
}: {
  params: Promise<{ internshipId: string }>;
}) {
  const { internshipId } = await params;

  return <InternshipDetail id={internshipId} />;
}
