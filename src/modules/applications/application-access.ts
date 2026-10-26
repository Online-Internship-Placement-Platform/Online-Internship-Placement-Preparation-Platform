export function applicationResumeFilter(id: number, userId: number, isAdmin: boolean) {
  return { id, ...(isAdmin ? {} : { studentId: userId }) };
}
