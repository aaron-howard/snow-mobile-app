/** Maximum number of exams a user may have actively enrolled at once (Req 2.6). */
export const MAX_ACTIVE_ENROLLMENTS = 5;

export const EnrollmentGuard = {
  /**
   * @param activeExamIds Exam IDs the user currently has enrolled (active).
   * @returns true iff the user may enroll in one more exam.
   */
  canEnroll(activeExamIds: readonly string[]): boolean {
    return activeExamIds.length < MAX_ACTIVE_ENROLLMENTS;
  },
} as const;
