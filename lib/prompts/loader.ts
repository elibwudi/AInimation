import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';
const log = createLogger('PromptLoader');

export type PromptId = 
  | 'interactive-scientific-model' 
  | 'interactive-html' 
  | 'interactive-refine' 
  | 'concept-expansion';

export interface LoadedPrompt {
  id: PromptId;
  systemPrompt: string;
  userPromptTemplate: string;
}

const promptCache = new Map<string, LoadedPrompt>();

function getPromptsDir(): string {
  return path.join(process.cwd(), 'lib', 'prompts');
}

export function loadPrompt(promptId: PromptId): LoadedPrompt | null {
  // In development, skip cache so template edits take effect without restart
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const cached = promptCache.get(promptId);
    if (cached) return cached;
  }

  const promptDir = path.join(getPromptsDir(), 'templates', promptId);

  try {
    const systemPath = path.join(promptDir, 'system.md');
    const systemPrompt = fs.readFileSync(systemPath, 'utf-8').trim();

    const userPath = path.join(promptDir, 'user.md');
    let userPromptTemplate = '';
    try {
      userPromptTemplate = fs.readFileSync(userPath, 'utf-8').trim();
    } catch {
      // user.md is optional
    }

    const loaded: LoadedPrompt = {
      id: promptId,
      systemPrompt,
      userPromptTemplate,
    };

    promptCache.set(promptId, loaded);
    return loaded;
  } catch (error) {
    log.error(`Failed to load prompt ${promptId}:`, error);
    return null;
  }
}

export function interpolateVariables(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined) return match;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  });
}

export function buildPrompt(
  promptId: PromptId,
  variables: Record<string, unknown>,
): { system: string; user: string } | null {
  const prompt = loadPrompt(promptId);
  if (!prompt) return null;

  return {
    system: interpolateVariables(prompt.systemPrompt, variables),
    user: interpolateVariables(prompt.userPromptTemplate, variables),
  };
}
