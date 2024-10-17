import { Judge0Status } from './enums/judge0-status.enum';

export const DEFAULT_PAGINATION_LIMIT = 10;
export const LANGUAGE_MAP = {
  javascript: 63,
  python: 71,
  'c++': 54,
  java: 62,
};

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
