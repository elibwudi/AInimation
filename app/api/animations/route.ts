import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = nanoid(10);
    
    // Create new animation record pointing to draft status
    dbHelpers.create({
      id,
      title: body.title,
      subject: body.subject,
      overview: body.overview,
      key_points: body.key_points ? JSON.stringify(body.key_points) : undefined,
      design_idea: body.design_idea,
      language: body.language || 'zh-CN',
      status: 'draft'
    });
    
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const list = dbHelpers.list();
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
