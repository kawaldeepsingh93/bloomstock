import { jsonCompletionRequest, modelLocksDefaultTemperature, withJsonInstruction } from './llm';

describe('modelLocksDefaultTemperature', () => {
  it('locks gpt-5 and reasoning models to the API default', () => {
    expect(modelLocksDefaultTemperature('gpt-5')).toBe(true);
    expect(modelLocksDefaultTemperature('gpt-5-mini')).toBe(true);
    expect(modelLocksDefaultTemperature('o3-mini')).toBe(true);
  });

  it('allows a custom temperature on GPT-4 class models', () => {
    expect(modelLocksDefaultTemperature('gpt-4o')).toBe(false);
  });
});

describe('jsonCompletionRequest', () => {
  it('omits temperature for gpt-5', () => {
    const request = jsonCompletionRequest({
      model: 'gpt-5',
      system: 'sys',
      user: '{}',
    });
    expect(request.temperature).toBeUndefined();
    expect(request.response_format).toEqual({ type: 'json_object' });
  });

  it('sets temperature 0.1 for gpt-4o', () => {
    const request = jsonCompletionRequest({
      model: 'gpt-4o',
      system: 'sys',
      user: '{}',
    });
    expect(request.temperature).toBe(0.1);
  });

  it('adds a JSON instruction when the prompt never says json', () => {
    const request = jsonCompletionRequest({
      model: 'gpt-5',
      system: 'You are an IPO analyst.',
      user: 'Return subscribe, avoid, or wait.',
    });
    const system = String(request.messages[0]?.content);
    expect(/json/i.test(system)).toBe(true);
  });
});

describe('withJsonInstruction', () => {
  it('leaves prompts that already mention JSON unchanged', () => {
    const system = 'Output strict JSON matching the schema.';
    expect(withJsonInstruction(system, 'facts')).toEqual({ system, user: 'facts' });
  });
});
