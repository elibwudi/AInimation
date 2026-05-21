import { parseJsonResponse } from './json-repair';
import { buildPrompt } from '../prompts/loader';
import type { AICallFn } from '../llm';
import { createLogger } from '../logger';

const log = createLogger('ConceptExpander');

export interface ExpandedConcept {
  inferred_subject?: string;
  core_difficulty: string;
  enriched_key_points: string[];
  expanded_overview: string;
  expanded_design_idea: string;
}

export async function expandConcept(
  config: {
    subject?: string;
    conceptName: string;
    conceptOverview: string;
    keyPoints?: string[];
    designIdea?: string;
  },
  aiCall: AICallFn
): Promise<ExpandedConcept | undefined> {
  const expandPrompts = buildPrompt('concept-expansion', {
    subject: config.subject || '通用',
    conceptName: config.conceptName,
    conceptOverview: config.conceptOverview || '暂无说明',
    keyPoints: (config.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n') || '无',
    designIdea: config.designIdea || '自由设计一个最复杂、效果最好的交互机制',
  });

  if (!expandPrompts) {
    log.error('Failed to build prompt for concept expansion');
    return undefined;
  }

  try {
    // Use a slightly higher temperature for creative brainstorming
    const rawResponse = await aiCall(expandPrompts.system, expandPrompts.user, 0.6);
    const parsed = parseJsonResponse<ExpandedConcept>(rawResponse);
    if (parsed && parsed.expanded_overview && parsed.expanded_design_idea) {
      return parsed;
    }
  } catch (error) {
    log.error('Concept expansion failed:', error);
  }
  
  return undefined;
}
