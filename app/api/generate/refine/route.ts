import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';
import { refineInteractiveHtml } from '@/lib/generator/html-generator';
import { callLLM } from '@/lib/llm';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { id, feedback } = await req.json();
    
    if (!feedback?.trim()) {
      return NextResponse.json({ success: false, error: 'Feedback is required' }, { status: 400 });
    }
    
    const record = dbHelpers.getById(id);
    if (!record || !record.html) {
      return NextResponse.json({ success: false, error: 'Record or HTML not found' }, { status: 404 });
    }

    dbHelpers.update(id, { status: 'generating' });

    let scientificModel;
    if (record.scientific_model) {
      try { scientificModel = JSON.parse(record.scientific_model); } catch {}
    }

    const result = await refineInteractiveHtml(
      record.html,
      feedback,
      scientificModel,
      {
        conceptName: record.title,
        conceptOverview: record.overview,
        designIdea: record.design_idea || '',
      },
      callLLM
    );

    if (!result) {
      dbHelpers.update(id, { status: 'review' }); // Restore status on failure
      throw new Error('Failed to generate refined HTML');
    }

    const { html: newHtml, scriptUpdate } = result;

    // Update both HTML and optionally the script (design_idea)
    const updates: any = { html: newHtml, status: 'review' };
    
    if (scriptUpdate) {
      // Append the script update to the existing design idea to maintain history/context
      const cleanedUpdate = scriptUpdate.replace(/^\[SCRIPT_UPDATE\]|\[\/SCRIPT_UPDATE\]$/g, '').trim();
      updates.design_idea = (record.design_idea ? record.design_idea + '\n\n' : '') + `[AI 自动同步]: ${cleanedUpdate}`;
    }

    dbHelpers.update(id, updates);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Refine Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
