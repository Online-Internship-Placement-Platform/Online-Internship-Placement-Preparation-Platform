import { currentStudent, students, type Student } from "@/lib/placement-data";

function cloneStudent(student: Student): Student {
  return {
    ...student,
    skills: [...student.skills],
    resume: student.resume ? { ...student.resume } : null,
  };
}

// This in-memory copy intentionally resets to the seed when the page is reloaded.
const studentRecords = students.map(cloneStudent);

export function getStudents(): Student[] {
  return studentRecords.map(cloneStudent);
}

export function getStudentById(id: string): Student | undefined {
  const student = studentRecords.find((record) => record.id === id);
  return student ? cloneStudent(student) : undefined;
}

export function replaceStudent(id: string, next: Student): Student | undefined {
  const index = studentRecords.findIndex((record) => record.id === id);
  if (index === -1 || next.id !== id) return undefined;

  const replacement = cloneStudent(next);
  studentRecords[index] = replacement;
  if (id === currentStudent.id) Object.assign(currentStudent, cloneStudent(replacement));
  return cloneStudent(replacement);
}
