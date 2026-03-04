import { NextResponse } from 'next/server';
import { getCurrentJiraUser } from '@/services/jiraService';
import axios from 'axios';

export async function GET() {
  const demoUserId = '00000000-0000-0000-0000-000000000001';

  try {
    const user = await getCurrentJiraUser(demoUserId);
    return NextResponse.json(user);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        error.response?.data ?? { error: 'Failed to fetch user' },
        { status: error.response?.status ?? 500 },
      );
    }

    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 },
    );
  }
}
