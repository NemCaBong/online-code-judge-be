import axios, { Method, AxiosResponse } from 'axios';

export default async function callJudgeServer(
  submissionData: any,
  method: Method = 'POST',
  subUrl: string = '',
): Promise<AxiosResponse<any>> {
  const url = `http://${process.env.NODE_ENV === 'production' ? 'judge0-server' : 'localhost'}:2358/${subUrl}`;

  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
    },
    data: submissionData,
  };

  if (method === 'GET') {
    // For GET requests, remove the data property
    delete config.data;
  }

  return axios(config);
}
