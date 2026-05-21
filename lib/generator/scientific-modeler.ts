import { parseJsonResponse } from './json-repair';
import { buildPrompt } from '../prompts/loader';
import type { ScientificModel } from '../types';
import type { AICallFn } from '../llm';

export async function generateScientificModel(
  config: {
    subject?: string;
    conceptName: string;
    conceptOverview: string;
    keyPoints?: string[];
    designIdea?: string;
  },
  aiCall: AICallFn
): Promise<ScientificModel | undefined> {
  const modelPrompts = buildPrompt('interactive-scientific-model', {
    subject: config.subject || '',
    conceptName: config.conceptName,
    conceptOverview: config.conceptOverview,
    keyPoints: (config.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n'),
    designIdea: config.designIdea || '',
  });

  if (!modelPrompts) {
    throw new Error('Failed to build prompt for scientific model');
  }

  try {
    const rawResponse = await aiCall(modelPrompts.system, modelPrompts.user);
    const parsed = parseJsonResponse<ScientificModel>(rawResponse);
    if (parsed && parsed.core_formulas) {
      return parsed;
    }
  } catch (error) {
    console.warn(`Scientific modeling failed: ${error}`);
  }
  
  return undefined;
}
