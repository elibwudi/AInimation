import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = dbHelpers.getById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    dbHelpers.update(id, { 
      status: 'published',
      published_at: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
