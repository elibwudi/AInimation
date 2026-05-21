export interface ScientificModel {
  core_formulas: string[];
  mechanism: string[];
  constraints: string[];
  forbidden_errors: string[];
}

export interface InteractiveAnimationConfig {
  conceptName: string;
  conceptOverview: string;
  designIdea: string;
  subject?: string;
  keyPoints?: string[];
  language?: 'zh-CN' | 'en-US';
}

export interface GenerationResult {
  html: string;
  scientificModel?: ScientificModel;
}
