import { postProcessInteractiveHtml } from './post-processor';
import { buildPrompt } from '../prompts/loader';
import type { ScientificModel } from '../types';
import type { AICallFn } from '../llm';
import { createLogger } from '../logger';

const log = createLogger('HTMLGenerator');

function extractHtml(response: string): string | null {
  const doctypeStart = response.indexOf('<!DOCTYPE html>');
  const htmlTagStart = response.indexOf('<html');
  const start = doctypeStart !== -1 ? doctypeStart : htmlTagStart;

  if (start !== -1) {
    const htmlEnd = response.lastIndexOf('</html>');
    if (htmlEnd !== -1) {
      return response.substring(start, htmlEnd + 7);
    }
  }

  const codeBlockMatch = response.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const content = codeBlockMatch[1].trim();
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      return content;
    }
  }

  const trimmed = response.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return trimmed;
  }

  return null;
}

export async function generateInteractiveHtml(
  config: {
    conceptName: string;
    conceptOverview: string;
    subject?: string;
    keyPoints?: string[];
    designIdea?: string;
    language?: 'zh-CN' | 'en-US';
  },
  scientificModel: ScientificModel | undefined,
  aiCall: AICallFn
): Promise<string | null> {
  let scientificConstraints = 'No specific scientific constraints available.';
  if (scientificModel) {
    const lines: string[] = [];
    if (scientificModel.core_formulas?.length) {
      lines.push(`Core Formulas: ${scientificModel.core_formulas.join('; ')}`);
    }
    if (scientificModel.mechanism?.length) {
      lines.push(`Mechanisms: ${scientificModel.mechanism.join('; ')}`);
    }
    if (scientificModel.constraints?.length) {
      lines.push(`Must Obey: ${scientificModel.constraints.join('; ')}`);
    }
    if (scientificModel.forbidden_errors?.length) {
      lines.push(`Forbidden Errors: ${scientificModel.forbidden_errors.join('; ')}`);
    }
    scientificConstraints = lines.join('\n');
  }

  const htmlPrompts = buildPrompt('interactive-html', {
    conceptName: config.conceptName,
    subject: config.subject || '',
    conceptOverview: config.conceptOverview,
    keyPoints: (config.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n'),
    scientificConstraints,
    designIdea: config.designIdea || '',
    language: config.language || 'zh-CN',
  });

  if (!htmlPrompts) {
    log.error(`Failed to build HTML prompt`);
    return null;
  }

  const response = await aiCall(htmlPrompts.system, htmlPrompts.user, 0.7);
  const rawHtml = extractHtml(response);
  
  if (!rawHtml) {
    log.error(`Failed to extract HTML from response`);
    return null;
  }

  return postProcessInteractiveHtml(rawHtml);
}

export async function refineInteractiveHtml(
  currentHtml: string,
  feedback: string,
  scientificModel: ScientificModel | undefined,
  scriptContext: {
    conceptName: string;
    conceptOverview: string;
    designIdea?: string;
  },
  aiCall: AICallFn
): Promise<{ html: string; scriptUpdate?: string } | null> {
  let scientificConstraints = 'Maintain all existing functional and layout concepts safely.';
  if (scientificModel) {
    const lines: string[] = [];
    if (scientificModel.constraints?.length) {
      lines.push(`Must Obey: ${scientificModel.constraints.join('; ')}`);
    }
    if (scientificModel.forbidden_errors?.length) {
      lines.push(`Forbidden Errors: ${scientificModel.forbidden_errors.join('; ')}`);
    }
    if (lines.length > 0) {
      scientificConstraints = lines.join('\n');
    }
  }

  const refinePrompts = buildPrompt('interactive-refine', {
    feedback,
    currentHtml,
    conceptName: scriptContext.conceptName,
    conceptOverview: scriptContext.conceptOverview,
    designIdea: scriptContext.designIdea || '',
    scientificConstraints
  });

  if (!refinePrompts) {
    log.error(`Failed to build refine prompt`);
    return null;
  }

  const response = await aiCall(refinePrompts.system, refinePrompts.user, 0.6);
  
  // Extract script update if AI followed the [SCRIPT_UPDATE] tagging convention
  const scriptUpdateMatch = response.match(/\[SCRIPT_UPDATE\]\s*([\s\S]*?)\[\/SCRIPT_UPDATE\]/);
  const scriptUpdate = scriptUpdateMatch ? scriptUpdateMatch[1].trim() : undefined;
  
  const rawHtml = extractHtml(response);

  if (!rawHtml) {
    log.error(`Failed to extract HTML from refine response`);
    return null;
  }

  return {
    html: postProcessInteractiveHtml(rawHtml),
    scriptUpdate
  };
}
