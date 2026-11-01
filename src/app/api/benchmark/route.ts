import { NextRequest, NextResponse } from 'next/server';
import { generateBenchmarkComparison } from '@/engine/benchmark-comparator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const comparison = await generateBenchmarkComparison(query);
    return NextResponse.json(comparison);
  } catch (error: any) {
    console.error('Benchmark comparison API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
