import { NextResponse } from 'next/server';
import { expandConcept } from '@/lib/generator/concept-expander';
import { callLLM } from '@/lib/llm';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { title, subject, overview, key_points } = await req.json();
    
    if (!title) {
      return NextResponse.json({ success: false, error: '请先填写概念名称' }, { status: 400 });
    }

    const expanded = await expandConcept({
      subject,
      conceptName: title,
      conceptOverview: overview,
      keyPoints: key_points,
      designIdea: '' // Leave empty to force generation
    }, callLLM);

    if (!expanded) {
      throw new Error('Failed to generate idea');
    }

    return NextResponse.json({ 
      success: true, 
      design_idea: expanded.expanded_design_idea 
    });
  } catch (err: any) {
    console.error('Idea Generation Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
