import type { NextApiRequest, NextApiResponse } from 'next';
import { demoStats } from '@/lib/mockApi/fixtures';

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  return response.status(200).json({ stats: demoStats });
}
