export type Role = "student" | "admin" | "super-admin";
export type InternshipStatus = "Open" | "Closed";
export const APPLICATION_STATUSES = ["Pending", "Under review", "Shortlisted", "Rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type StudentResume = { fileName: string; sizeBytes: number };
export type Student = { id: string; name: string; email: string; branch: string; cgpa: number; yearOfStudy: number; skills: string[]; avatar?: string; resume?: StudentResume | null };
export type Internship = { id: string; company: string; role: string; domain: string; location: string; skills: string[]; branches: string[]; minCgpa: number; deadline: string; stipend: string; description: string };
export type Application = { id: string; internshipId: string; studentName: string; appliedOn: string; status: ApplicationStatus };
export type Assessment = { name: string; domain: string; score: number; total: number; date: string };

export const students: Student[] = [
  { id: "stu-001", name: "Aarav Mehta", email: "aarav.mehta@university.edu", branch: "Computer Science", cgpa: 8.6, yearOfStudy: 3, skills: ["React", "TypeScript", "SQL", "Figma"], avatar: "AM", resume: null },
  { id: "stu-002", name: "Ishita Shah", email: "ishita.shah@university.edu", branch: "Information Technology", cgpa: 8.2, yearOfStudy: 3, skills: ["React", "SQL", "Python"], avatar: "IS", resume: null },
  { id: "stu-003", name: "Kabir Rao", email: "kabir.rao@university.edu", branch: "Computer Science", cgpa: 7.8, yearOfStudy: 4, skills: ["Node.js", "PostgreSQL", "TypeScript"], avatar: "KR", resume: null },
  { id: "stu-004", name: "Maya Iyer", email: "maya.iyer@university.edu", branch: "Design", cgpa: 9.1, yearOfStudy: 2, skills: ["Figma", "Research", "Prototyping"], avatar: "MI", resume: null },
  { id: "stu-005", name: "Rohan Patel", email: "rohan.patel@university.edu", branch: "Electrical Engineering", cgpa: 7.1, yearOfStudy: 1, skills: ["Python", "Excel", "Communication"], avatar: "RP", resume: null },
  { id: "stu-006", name: "Leena Das", email: "leena.das@university.edu", branch: "Computer Science", cgpa: 8.0, yearOfStudy: 2, skills: ["React", "SQL", "CSS"], avatar: "LD", resume: null },
];
export const currentStudent: Student = students[0];
export const internships: Internship[] = [
  { id: "int-001", company: "Northstar Labs", role: "Frontend Engineering Intern", domain: "Software Development", location: "Bengaluru · Hybrid", skills: ["React", "TypeScript", "CSS"], branches: ["Computer Science", "Information Technology"], minCgpa: 7.5, deadline: "2026-11-08", stipend: "₹35,000 / month", description: "Build polished product experiences with a small, collaborative engineering team." },
  { id: "int-002", company: "Aster Finance", role: "Data Analyst Intern", domain: "Data & Analytics", location: "Mumbai · On-site", skills: ["SQL", "Python", "Excel"], branches: ["Computer Science", "Information Technology", "Statistics"], minCgpa: 8, deadline: "2026-10-28", stipend: "₹30,000 / month", description: "Turn financial data into clear insights that help teams make better decisions." },
  { id: "int-003", company: "Studio Kora", role: "Product Design Intern", domain: "Design", location: "Remote", skills: ["Figma", "Research", "Prototyping"], branches: ["Any branch"], minCgpa: 7, deadline: "2026-11-18", stipend: "₹25,000 / month", description: "Work end-to-end on product discovery, interaction design, and visual systems." },
  { id: "int-004", company: "Cloudline Systems", role: "Backend Developer Intern", domain: "Software Development", location: "Pune · Hybrid", skills: ["Node.js", "PostgreSQL", "REST APIs"], branches: ["Computer Science", "Information Technology"], minCgpa: 8.5, deadline: "2026-10-20", stipend: "₹40,000 / month", description: "Design reliable APIs and services used by thousands of learners every day." },
  { id: "int-005", company: "GreenGrid Energy", role: "Business Strategy Intern", domain: "Business", location: "Delhi · Hybrid", skills: ["Research", "Excel", "Communication"], branches: ["Any branch"], minCgpa: 7.5, deadline: "2026-09-30", stipend: "₹28,000 / month", description: "Help shape the next generation of sustainable energy products." },
];
export const applications: Application[] = [
  { id: "app-001", internshipId: "int-001", studentName: "Aarav Mehta", appliedOn: "2026-10-12", status: "Shortlisted" }, { id: "app-002", internshipId: "int-002", studentName: "Aarav Mehta", appliedOn: "2026-10-10", status: "Under review" }, { id: "app-003", internshipId: "int-003", studentName: "Aarav Mehta", appliedOn: "2026-09-28", status: "Rejected" }, { id: "app-004", internshipId: "int-001", studentName: "Ishita Shah", appliedOn: "2026-10-13", status: "Under review" }, { id: "app-005", internshipId: "int-004", studentName: "Kabir Rao", appliedOn: "2026-10-11", status: "Under review" },
];
export const assessments: Assessment[] = [{ name: "Frontend Foundations", domain: "Software Development", score: 42, total: 50, date: "2026-10-14" }, { name: "SQL & Data Modeling", domain: "Data & Analytics", score: 35, total: 50, date: "2026-10-05" }, { name: "Product Thinking", domain: "Design", score: 31, total: 50, date: "2026-09-22" }];
export function getInternshipStatus(deadline: string): InternshipStatus { return new Date(`${deadline}T23:59:59.999Z`).getTime() >= Date.now() ? "Open" : "Closed"; }
export function getInternship(id: string) { return internships.find((internship) => internship.id === id); }
export function formatDate(date: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`)); }
