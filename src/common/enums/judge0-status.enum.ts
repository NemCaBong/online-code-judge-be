export enum Judge0Status {
  IN_QUEUE = 1,
  PROCESSING = 2,
  ACCEPTED = 3,
  WRONG_ANSWER = 4,
  TIME_LIMIT_EXCEEDED = 5,
  COMPILATION_ERROR = 6,
  RUNTIME_ERROR_SIGSEGV = 7,
  RUNTIME_ERROR_SIGXFSZ = 8,
  RUNTIME_ERROR_SIGFPE = 9,
  RUNTIME_ERROR_SIGABRT = 10,
  RUNTIME_ERROR_NZEC = 11,
  RUNTIME_ERROR_OTHER = 12,
  INTERNAL_ERROR = 13,
  EXEC_FORMAT_ERROR = 14,
}

export const Judge0StatusDescription = {
  [Judge0Status.IN_QUEUE]: 'In Queue',
  [Judge0Status.PROCESSING]: 'Processing',
  [Judge0Status.ACCEPTED]: 'Accepted',
  [Judge0Status.WRONG_ANSWER]: 'Wrong Answer',
  [Judge0Status.TIME_LIMIT_EXCEEDED]: 'Time Limit Exceeded',
  [Judge0Status.COMPILATION_ERROR]: 'Compilation Error',
  [Judge0Status.RUNTIME_ERROR_SIGSEGV]: 'Runtime Error (SIGSEGV)',
  [Judge0Status.RUNTIME_ERROR_SIGXFSZ]: 'Runtime Error (SIGXFSZ)',
  [Judge0Status.RUNTIME_ERROR_SIGFPE]: 'Runtime Error (SIGFPE)',
  [Judge0Status.RUNTIME_ERROR_SIGABRT]: 'Runtime Error (SIGABRT)',
  [Judge0Status.RUNTIME_ERROR_NZEC]: 'Runtime Error (NZEC)',
  [Judge0Status.RUNTIME_ERROR_OTHER]: 'Runtime Error (Other)',
  [Judge0Status.INTERNAL_ERROR]: 'Internal Error',
  [Judge0Status.EXEC_FORMAT_ERROR]: 'Exec Format Error',
};
