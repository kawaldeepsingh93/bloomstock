import { defaultIpoHeadline, matchIpoReviews, tallyIpoVerdicts } from './ipo-book';
import type { IpoIssue } from '@bloomstock/core';

const sample = (name: string, verdict: 'subscribe' | 'avoid' | 'wait') => ({
  name,
  verdict,
  rationale: `${name} note`,
  risks: ['Grey market is not a listing guarantee'],
});

describe('matchIpoReviews', () => {
  const ipos: IpoIssue[] = [
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
    {
      id: '2',
      name: 'Example IPO',
      symbol: 'EXAM',
      openDate: new Date('2026-09-20'),
      closeDate: new Date('2026-09-24'),
      priceBandLow: 90,
      priceBandHigh: 96,
      lotSize: 150,
      status: 'upcoming',
    },
  ];

  it('maps model notes onto calendar names and waits on misses', () => {
    const reviews = matchIpoReviews(ipos, [sample('NSE', 'wait')]);
    expect(reviews[0]?.analysis.verdict).toBe('wait');
    expect(reviews[1]?.analysis.verdict).toBe('wait');
    expect(reviews[1]?.analysis.name).toBe('Example IPO');
  });
});

describe('tallyIpoVerdicts', () => {
  it('counts the book for the desk headline', () => {
    const tallies = tallyIpoVerdicts([
      sample('A', 'subscribe'),
      sample('B', 'wait'),
      sample('C', 'avoid'),
    ]);
    expect(tallies).toEqual({ subscribe: 1, wait: 1, avoid: 1 });
    expect(defaultIpoHeadline(tallies, 3)).toContain('Subscribe 1');
  });
});
