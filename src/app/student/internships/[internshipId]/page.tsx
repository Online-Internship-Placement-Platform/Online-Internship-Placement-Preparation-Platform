import { Suspense } from "react";
import { InternshipDetail } from "@/components/internship-detail";

type StudentInternshipDetailRouteProps = {
  params: Promise<{ internshipId: string }>;
};

async function InternshipDetailContent({ params }: StudentInternshipDetailRouteProps) {
  const { internshipId } = await params;

  return <InternshipDetail id={internshipId} />;
}

export default function StudentInternshipDetailRoute({
  params,
}: StudentInternshipDetailRouteProps) {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-[var(--background)] p-6 text-sm text-[#6e786f]"
          role="status"
          aria-live="polite"
        >
          Loading internship details…
        </div>
      }
    >
      <InternshipDetailContent params={params} />
    </Suspense>
  );
}
