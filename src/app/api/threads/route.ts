import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserThreads, saveUserThreads, Thread } from '@/lib/threads-storage';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id || session.user.email || 'default_user';
  const threads = getUserThreads(userId);

  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id || session.user.email || 'default_user';

  try {
    const body = await req.json();
    const { threads, syncMode } = body as { threads: Thread[]; syncMode?: 'replace' | 'merge' };

    if (!Array.isArray(threads)) {
      return NextResponse.json({ error: 'Invalid payload: threads array expected' }, { status: 400 });
    }

    if (syncMode === 'merge') {
      const existing = getUserThreads(userId);
      const existingIds = new Set(existing.map(t => t.id));
      const merged = [...existing];

      for (const t of threads) {
        if (!existingIds.has(t.id)) {
          merged.push(t);
        }
      }

      saveUserThreads(userId, merged);
      return NextResponse.json({ threads: merged });
    } else {
      saveUserThreads(userId, threads);
      return NextResponse.json({ threads });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update threads' }, { status: 500 });
  }
}
