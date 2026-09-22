import { ConfigurationError } from '@bloomstock/core';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

export interface LlmClient {
  completeJson(input: { system: string; user: string; model?: string }): Promise<string>;
}

export function modelLocksDefaultTemperature(model: string): boolean {
  return /^(gpt-5|o1|o3|o4)/.test(model);
}

const JSON_OBJECT_INSTRUCTION = 'Respond with a JSON object only.';

export function withJsonInstruction(system: string, user: string): { system: string; user: string } {
  if (/json/i.test(`${system}\n${user}`)) return { system, user };
  return {
    system: [system.trim(), JSON_OBJECT_INSTRUCTION].filter(Boolean).join('\n'),
    user,
  };
}

export function jsonCompletionRequest(input: {
  model: string;
  system: string;
  user: string;
}): ChatCompletionCreateParamsNonStreaming {
  const messages = withJsonInstruction(input.system, input.user);
  const request: ChatCompletionCreateParamsNonStreaming = {
    model: input.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: messages.system },
      { role: 'user', content: messages.user },
    ],
  };
  if (!modelLocksDefaultTemperature(input.model)) {
    request.temperature = 0.1;
  }
  return request;
}

export class OpenAiLlmClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL ?? 'gpt-5') {
    if (!apiKey) {
      throw new ConfigurationError('OPENAI_API_KEY is required');
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async completeJson(input: { system: string; user: string; model?: string }): Promise<string> {
    const completion = await this.client.chat.completions.create(
      jsonCompletionRequest({
        model: input.model ?? this.model,
        system: input.system,
        user: input.user,
      }),
    );
    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new ConfigurationError('OpenAI returned an empty completion');
    }
    return content;
  }
}
