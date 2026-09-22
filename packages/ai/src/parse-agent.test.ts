import { parseDeskNote, parseIpoAnalysis, parseIpoBook, parseJsonObject, parseMarketAgent, parseNewsAgent, parseTechnicalAgent } from './parse-agent';

describe('parseJsonObject', () => {
  it('unwraps fenced JSON and nested agent objects', () => {
    const record = parseJsonObject(
      '```json\n{"market_analyst":{"commentary":"VIX is calm","score":71}}\n```',
    );
    expect(record.commentary).toBe('VIX is calm');
    expect(record.score).toBe(71);
  });
});

describe('parseMarketAgent', () => {
  it('keeps the backend regime and fills missing fields from aliases', () => {
    const parsed = parseMarketAgent(
      JSON.stringify({ analysis: 'Nifty bid is firm', confidenceScore: '64' }),
      'bullish',
    );
    expect(parsed.regime).toBe('bullish');
    expect(parsed.rationale).toContain('Nifty');
    expect(parsed.confidence).toBe(64);
  });

  it('does not fail when GPT-5 omits the schema keys', () => {
    const parsed = parseMarketAgent('{"agent":"market_analyst","ok":true}', 'neutral');
    expect(parsed.regime).toBe('neutral');
    expect(parsed.rationale.length).toBeGreaterThan(0);
    expect(parsed.confidence).toBe(50);
  });
});

describe('parseTechnicalAgent', () => {
  it('falls back to the backend score', () => {
    const parsed = parseTechnicalAgent('{"reason":"EMA stack aligned"}', 'RELIANCE', 84);
    expect(parsed.symbol).toBe('RELIANCE');
    expect(parsed.technicalScore).toBe(84);
    expect(parsed.rationale).toContain('EMA');
  });
});

describe('parseNewsAgent', () => {
  it('accepts a missing headline', () => {
    const parsed = parseNewsAgent('{"summary":"Quiet tape"}', 'RELIANCE');
    expect(parsed.headline).toBeNull();
    expect(parsed.rationale).toBe('Quiet tape');
  });
});

describe('parseIpoAnalysis', () => {
  it('defaults to wait when the model omits verdict', () => {
    const parsed = parseIpoAnalysis('{"reason":"Book is thin"}', 'Example IPO');
    expect(parsed.name).toBe('Example IPO');
    expect(parsed.verdict).toBe('wait');
    expect(parsed.rationale).toContain('thin');
  });
});

describe('parseIpoBook', () => {
  it('covers every calendar name from one desk JSON payload', () => {
    const book = parseIpoBook(
      JSON.stringify({
        headline: 'Wait on the thin books.',
        reviews: [{ name: 'NSE', verdict: 'wait', rationale: 'No GMP in facts.', risks: ['Incomplete book'] }],
      }),
      [
        {
          id: '1',
          name: 'National Stock Exchange of India Limited',
          symbol: 'NSE',
          openDate: new Date('2026-09-16'),
          closeDate: new Date('2026-09-18'),
          priceBandLow: null,
          priceBandHigh: null,
          lotSize: null,
          status: 'upcoming',
        },
      ],
    );
    expect(book.wait).toBe(1);
    expect(book.reviews[0]?.analysis.rationale).toContain('GMP');
  });
});

describe('parseDeskNote', () => {
  it('falls back when the desk JSON is unusable', () => {
    const parsed = parseDeskNote('not json', { noTrade: true, message: 'No Trade Today' });
    expect(parsed.noTrade).toBe(true);
    expect(parsed.message).toBe('No Trade Today');
  });
});
