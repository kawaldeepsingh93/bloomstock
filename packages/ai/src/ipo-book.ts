import type { IpoAnalysis, IpoBookReview, IpoIssue, IpoReviewedIssue } from '@bloomstock/core';

export function tallyIpoVerdicts(reviews: IpoAnalysis[]): Pick<IpoBookReview, 'subscribe' | 'wait' | 'avoid'> {
  return {
    subscribe: reviews.filter((item) => item.verdict === 'subscribe').length,
    wait: reviews.filter((item) => item.verdict === 'wait').length,
    avoid: reviews.filter((item) => item.verdict === 'avoid').length,
  };
}

export function defaultIpoHeadline(
  tallies: Pick<IpoBookReview, 'subscribe' | 'wait' | 'avoid'>,
  total: number,
): string {
  if (total === 0) return 'No live IPO issues in the calendar.';
  if (tallies.subscribe === 0) {
    return `No subscribe names in this book. Wait ${tallies.wait}, avoid ${tallies.avoid}.`;
  }
  return `Subscribe ${tallies.subscribe} · wait ${tallies.wait} · avoid ${tallies.avoid}.`;
}

export function matchIpoReviews(ipos: IpoIssue[], analyses: IpoAnalysis[]): IpoReviewedIssue[] {
  return ipos.map((ipo) => {
    const analysis =
      analyses.find((item) => namesMatch(item.name, ipo.name) || namesMatch(item.name, ipo.symbol ?? '')) ??
      fallbackWait(ipo.name);
    return { ipo, analysis: { ...analysis, name: ipo.name } };
  });
}

function namesMatch(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function fallbackWait(name: string): IpoAnalysis {
  return {
    name,
    verdict: 'wait',
    rationale: 'The desk did not receive a complete view for this issue, so it waits.',
    risks: ['Facts supplied by the backend are incomplete.'],
  };
}
