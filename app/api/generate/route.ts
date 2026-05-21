import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';
import { generateScientificModel } from '@/lib/generator/scientific-modeler';
import { generateInteractiveHtml } from '@/lib/generator/html-generator';
import { expandConcept } from '@/lib/generator/concept-expander';
import { callLLM } from '@/lib/llm';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300;

export async function POST(req: Request) {
  let recordId: string | null = null;
  try {
    const { id, skipExpansion } = await req.json();
    recordId = id;
    
    const record = dbHelpers.getById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    dbHelpers.update(id, { status: 'generating' });

    // Run generation in background to avoid edge/browser timeout
    (async () => {
      try {
        let keyPoints: string[] | undefined;
        if (record.key_points) {
          try { keyPoints = JSON.parse(record.key_points); } catch {}
        }

        // Phase 0: Concept & Script Expansion
        let finalOverview = record.overview;
        let finalDesignIdea = record.design_idea || '';
        let finalKeyPoints = keyPoints;

        if (!skipExpansion) {
          const expanded = await expandConcept({
            subject: record.subject,
            conceptName: record.title,
            conceptOverview: record.overview,
            keyPoints,
            designIdea: record.design_idea
          }, callLLM);

          if (expanded) {
            const finalSubject = record.subject || expanded.inferred_subject || '大学教育';
            if (expanded.enriched_key_points && expanded.enriched_key_points.length > 0) {
              finalKeyPoints = expanded.enriched_key_points;
            }
            if (expanded.expanded_overview) finalOverview = expanded.expanded_overview;
            if (expanded.expanded_design_idea && expanded.expanded_design_idea.length > (finalDesignIdea.length || 0)) {
              finalDesignIdea = expanded.expanded_design_idea;
            }

            dbHelpers.update(id, { 
              subject: finalSubject,
              overview: finalOverview,
              design_idea: finalDesignIdea,
              core_difficulty: expanded.core_difficulty,
              key_points: JSON.stringify(finalKeyPoints)
            });
          }
        }

        // Phase 1: Scientific Modeling
        const scientificModel = await generateScientificModel({
          subject: record.subject,
          conceptName: record.title,
          conceptOverview: finalOverview,
          keyPoints: finalKeyPoints,
          designIdea: finalDesignIdea
        }, callLLM);

        if (scientificModel) {
          dbHelpers.update(id, { scientific_model: JSON.stringify(scientificModel) });
        }

        // Phase 2: HTML Generation
        const html = await generateInteractiveHtml({
          conceptName: record.title,
          conceptOverview: finalOverview,
          subject: record.subject,
          keyPoints: finalKeyPoints,
          designIdea: finalDesignIdea,
          language: record.language as any
        }, scientificModel, callLLM);

        if (!html) throw new Error('Failed to generate HTML');

        dbHelpers.update(id, { html, status: 'review' });
      } catch (err: any) {
        const logPath = path.join(process.cwd(), 'debug.log');
        const errorMessage = `[${new Date().toISOString()}] Background Generation Error: ${err.stack || err.message}\n`;
        fs.appendFileSync(logPath, errorMessage);
        console.error('Background Generation Error:', err);
        if (recordId) {
          try {
            dbHelpers.update(recordId, { status: 'error' });
          } catch (updateErr) {
            console.error('Failed to update status to error:', updateErr);
          }
        }
      }
    })();
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const logPath = path.join(process.cwd(), 'debug.log');
    const errorMessage = `[${new Date().toISOString()}] POST Request Error: ${err.stack || err.message}\n`;
    fs.appendFileSync(logPath, errorMessage);
    console.error('POST Request Error:', err);
    if (recordId) {
      try {
        dbHelpers.update(recordId, { status: 'error' });
      } catch (updateErr) {
        console.error('Failed to update status to error:', updateErr);
      }
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
