import type { PromptSlug, PromptTemplate } from '@bloomstock/core';
import { NotFoundError } from '@bloomstock/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export class PromptRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getActive(slug: PromptSlug): Promise<PromptTemplate> {
    const { data, error } = await this.db
      .from('prompt_templates')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError(`Prompt ${slug}`);
    return {
      slug: data.slug,
      version: data.version,
      system: data.system_prompt,
      user: data.user_prompt,
      isActive: data.is_active,
    };
  }

  async saveRecommendation(input: {
    userId?: string;
    scanResultId?: string;
    slug: PromptSlug;
    version: number;
    agentOutputs: unknown;
    reasoning: string;
    confidence: number;
  }): Promise<string> {
    const { data, error } = await this.db
      .from('ai_recommendations')
      .insert({
        user_id: input.userId ?? null,
        scan_result_id: input.scanResultId ?? null,
        prompt_slug: input.slug,
        prompt_version: input.version,
        agent_outputs: input.agentOutputs,
        reasoning: input.reasoning,
        confidence: input.confidence,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (body, [key, value]) => body.replaceAll(`{{${key}}}`, value),
    template,
  );
}
