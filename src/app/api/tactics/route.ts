import { NextRequest, NextResponse } from 'next/server';
import { consultHunterAgent } from '@/engine/agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, preferredWeapon, history } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await consultHunterAgent(query, { preferredWeapon, history });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Tactics API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
