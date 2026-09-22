import { renderPrompt } from './repositories/prompt-repository';

describe('renderPrompt', () => {
  it('substitutes versioned template variables without leftover tokens', () => {
    const rendered = renderPrompt('Regime {{regime}} on {{scanDate}}', {
      regime: 'bullish',
      scanDate: '2026-09-18',
    });
    expect(rendered).toBe('Regime bullish on 2026-09-18');
    expect(rendered.includes('{{')).toBe(false);
  });
});
