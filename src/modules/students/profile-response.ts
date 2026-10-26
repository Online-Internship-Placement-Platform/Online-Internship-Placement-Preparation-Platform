type StudentProfileRecord = {
  branch: string;
  cgpa: number;
  yearOfStudy: "FIRST" | "SECOND" | "THIRD" | "FOURTH";
  skills: unknown;
};

export type StudentProfileUserRecord = {
  id: number;
  name: string | null;
  email: string;
  studentProfile: StudentProfileRecord | null;
};

export function studentProfileResponse(user: StudentProfileUserRecord) {
  if (!user.studentProfile) return null;
  const { studentProfile } = user;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    branch: studentProfile.branch,
    cgpa: studentProfile.cgpa,
    yearOfStudy: studentProfile.yearOfStudy,
    skills: Array.isArray(studentProfile.skills) ? studentProfile.skills.filter((skill): skill is string => typeof skill === "string") : [],
  };
}
