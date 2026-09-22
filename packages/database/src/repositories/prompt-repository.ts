import type { AgentBundle, AiRecommendation, PromptSlug, PromptTemplate, SwingCandidate } from '@bloomstock/core';
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

  async listLatestDeskNotes(userId: string, limit = 5): Promise<AiRecommendation[]> {
    const { data, error } = await this.db
      .from('ai_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('prompt_slug', 'todays_trade')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapDeskNote);
  }
}

function mapDeskNote(row: Record<string, unknown>): AiRecommendation {
  const agents = (row.agent_outputs ?? {
    market: { regime: 'neutral', rationale: '', confidence: 0 },
    technical: null,
    news: null,
    risk: null,
    portfolio: null,
  }) as AgentBundle;
  const symbol = agents.technical?.symbol ?? agents.news?.symbol ?? null;
  const candidate: SwingCandidate | null = symbol
    ? {
        symbol,
        exchange: 'NSE',
        name: symbol,
        setupType: null,
        score: {
          trend: 0,
          momentum: 0,
          volume: 0,
          structure: 0,
          total: 0,
          reasons: [],
          rejects: [],
        },
        risk: null,
        confidence: Number(row.confidence),
        verdict: 'watch',
        rejectedReason: null,
      }
    : null;
  return {
    id: String(row.id),
    promptSlug: row.prompt_slug as PromptSlug,
    promptVersion: Number(row.prompt_version),
    candidate,
    agents,
    reasoning: String(row.reasoning ?? ''),
    confidence: Number(row.confidence),
    createdAt: new Date(String(row.created_at)),
  };
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (body, [key, value]) => body.replaceAll(`{{${key}}}`, value),
    template,
  );
}
