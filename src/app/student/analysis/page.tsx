
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { assessments, formatDate } from "@/lib/placement-data";

const getPercentage = (score: number, total: number) =>
  total > 0 ? Math.round((score / total) * 100) : 0;

const getLevel = (percentage: number) => {
  if (percentage >= 80) return "Strong";
  if (percentage >= 65) return "Developing";
  return "Needs practice";
};

const getResources = (domain: string) => {
  const resources: Record<string, { title: string; description: string; href: string }[]> = {
    "Software Development": [
      {
        title: "Programming fundamentals",
        description: "Revise core concepts and solve practice problems.",
        href: "https://www.geeksforgeeks.org/",
      },
      {
        title: "Coding practice",
        description: "Strengthen problem-solving with coding exercises.",
        href: "https://leetcode.com/problemset/",
      },
    ],
    "Data & Analytics": [
      {
        title: "SQL practice",
        description: "Practise queries, joins, grouping, and subqueries.",
        href: "https://sqlbolt.com/",
      },
      {
        title: "Python for data analysis",
        description: "Review data manipulation and analysis basics.",
        href: "https://pandas.pydata.org/docs/getting_started/",
      },
    ],
    Design: [
      {
        title: "Design fundamentals",
        description: "Review usability, visual hierarchy, and interaction design.",
        href: "https://www.nngroup.com/articles/",
      },
      {
        title: "Figma learning resources",
        description: "Practise prototyping and interface design.",
        href: "https://help.figma.com/",
      },
    ],
  };

  return resources[domain] ?? [
    {
      title: `${domain} practice`,
      description: "Review the concepts from this domain and practise questions.",
      href: "https://www.geeksforgeeks.org/",
    },
  ];
};

export default function StudentAnalysisPage() {
  const domainStats = Object.values(
    assessments.reduce<
      Record<string, { domain: string; score: number; total: number; attempts: number }>
    >((groups, item) => {
      if (!groups[item.domain]) {
        groups[item.domain] = {
          domain: item.domain,
          score: 0,
          total: 0,
          attempts: 0,
        };
      }

      groups[item.domain].score += item.score;
      groups[item.domain].total += item.total;
      groups[item.domain].attempts += 1;

      return groups;
    }, {})
  )
    .map((item) => ({
      ...item,
      percentage: getPercentage(item.score, item.total),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const strongest = domainStats[0];
  const weakest = domainStats[domainStats.length - 1];

  const overallPercentage = getPercentage(
    assessments.reduce((sum, item) => sum + item.score, 0),
    assessments.reduce((sum, item) => sum + item.total, 0)
  );

  const chronologicalAssessments = [...assessments].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  const recommendations = weakest ? getResources(weakest.domain) : [];
    const progressTrends = domainStats.map((domain) => {
    const attempts = assessments
      .filter((item) => item.domain === domain.domain)
      .sort((a, b) => a.date.localeCompare(b.date));

    const first = attempts[0];
    const latest = attempts[attempts.length - 1];

    const firstPercentage = first
      ? getPercentage(first.score, first.total)
      : 0;

    const latestPercentage = latest
      ? getPercentage(latest.score, latest.total)
      : 0;

    return {
      domain: domain.domain,
      attempts: attempts.length,
      change: latestPercentage - firstPercentage,
      firstPercentage,
      latestPercentage,
    };
  });

  return (
    <AppShell
      role="student"
      title="Performance Analysis"
      eyebrow="Your preparation"
    >
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-sm text-[#6e786f]">
          Understand your strengths, identify weaker domains, and decide what
          to practise next.
        </p>

        <Link
          href="/student/assessments"
          className="inline-flex w-fit rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white"
        >
          View Assessments
        </Link>
      </div>

      {assessments.length === 0 ? (
        <section className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center">
          <h2 className="font-semibold">No assessment results yet</h2>
          <p className="mt-2 text-sm text-[#6e786f]">
            Complete an assessment to start analysing your performance.
          </p>
          <Link
            href="/student/assessments"
            className="mt-5 inline-block rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to Assessments
          </Link>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Overall Score"
              value={`${overallPercentage}%`}
              detail="Across recorded assessments"
            />
            <MetricCard
              label="Domains Assessed"
              value={String(domainStats.length)}
              detail="Unique preparation domains"
            />
            <MetricCard
              label="Strongest Domain"
              value={strongest.domain}
              detail={`${strongest.percentage}% average`}
            />
            <MetricCard
              label="Focus Area"
              value={weakest.domain}
              detail={`${weakest.percentage}% average`}
            />
          </div>

          <section className="mt-8">
            <SectionTitle
              title="Strengths & Weaknesses"
              description="Domain performance is calculated from the recorded assessment scores."
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {domainStats.map((item) => (
                <div
                  key={item.domain}
                  className="rounded-xl border border-[#e2e7e1] bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{item.domain}</h3>
                      <p className="mt-1 text-xs text-[#7b857c]">
                        {item.attempts} recorded{" "}
                        {item.attempts === 1 ? "assessment" : "assessments"}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#f1f3ef] px-2 py-1 text-xs font-semibold text-[#526057]">
                      {getLevel(item.percentage)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-[#6e786f]">Average score</span>
                    <span className="font-semibold">
                      {item.percentage}%
                    </span>
                  </div>

                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0eb]"
                    role="progressbar"
                    aria-label={`${item.domain} average score`}
                    aria-valuenow={item.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-[#176b50]"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionTitle
              title="Progress History"
              description="Your assessment scores in chronological order."
            />

            <div className="overflow-x-auto rounded-xl border border-[#e2e7e1] bg-white">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-[#f8faf7] text-xs text-[#6e786f]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Assessment</th>
                    <th className="px-5 py-3 font-semibold">Domain</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {chronologicalAssessments.map((item, index) => (
                    <tr
                      key={`${item.name}-${item.date}-${index}`}
                      className="border-t border-[#e2e7e1]"
                    >
                      <td className="px-5 py-4 font-medium">{item.name}</td>
                      <td className="px-5 py-4 text-[#6e786f]">
                        {item.domain}
                      </td>
                      <td className="px-5 py-4 text-[#6e786f]">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {item.score}/{item.total} (
                        {getPercentage(item.score, item.total)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-[#7b857c]">
              A true improvement trend requires multiple attempts over time
              within the same domain.
            </p>
          </section>

          
          <section className="mt-8">
            <SectionTitle
              title="Progress Trends"
              description="Compare your earliest and latest scores within each domain."
            />

            <div className="grid gap-4 md:grid-cols-2">
              {progressTrends.map((trend) => (
                <div
                  key={trend.domain}
                  className="rounded-xl border border-[#e2e7e1] bg-white p-5"
                >
                  <h3 className="text-sm font-semibold">
                    {trend.domain}
                  </h3>

                  {trend.attempts < 2 ? (
                    <p className="mt-3 text-sm text-[#6e786f]">
                      Complete another assessment in this domain to track
                      your progress.
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 text-sm text-[#6e786f]">
                        {trend.firstPercentage}% → {trend.latestPercentage}%
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#176b50]">
                        {trend.change > 0
                          ? `Improved by ${trend.change} percentage points`
                          : trend.change < 0
                            ? `Decreased by ${Math.abs(trend.change)} percentage points`
                            : "Your score is unchanged"}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>


          <section className="mt-8">
            <SectionTitle
              title="Recommended Preparation"
              description={
                weakest
                  ? `Suggested resources for your current focus area: ${weakest.domain}.`
                  : "Suggested resources based on your results."
              }
            />

            <div className="grid gap-4 md:grid-cols-2">
              {recommendations.map((resource) => (
                <div
                  key={resource.title}
                  className="rounded-xl border border-[#e2e7e1] bg-white p-5"
                >
                  <h3 className="text-sm font-semibold">{resource.title}</h3>
                  <p className="mt-2 text-sm text-[#6e786f]">
                    {resource.description}
                  </p>
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm font-semibold text-[#176b50] underline"
                  >
                    Explore resource ↗
                  </a>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-[#7b857c]">
              These are rule-based suggestions using sample assessment data,
              not AI-generated recommendations.
            </p>
          </section>
        </>
      )}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e2e7e1] bg-white p-5">
      <p className="text-xs font-medium text-[#6e786f]">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold text-[#176b50]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#7b857c]">{detail}</p>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[#6e786f]">{description}</p>
    </div>
  );
}
