import { NextResponse } from 'next/server';
import { getDeletePermissionForIssue } from '@/services/jiraService';
import axios from 'axios';

export async function GET(request: Request) {
  const demoUserId = '00000000-0000-0000-0000-000000000001';

  const { searchParams } = new URL(request.url);
  const issueIdOrKey = searchParams.get('issueIdOrKey');

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: 'issueIdOrKey query parameter is required' },
      { status: 400 },
    );
  }

  try {
    const canDelete = await getDeletePermissionForIssue(
      demoUserId,
      issueIdOrKey,
    );

    return NextResponse.json({ canDelete });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        error.response?.data ?? { error: 'Failed to check permission' },
        { status: error.response?.status ?? 500 },
      );
    }

    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 },
    );
  }
}
