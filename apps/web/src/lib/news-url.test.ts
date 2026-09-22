import { resolveNewsUrl } from './news-url';

describe('resolveNewsUrl', () => {
  it('keeps an absolute filing URL', () => {
    expect(resolveNewsUrl('https://nsearchives.nseindia.com/corporate/a.pdf')).toBe(
      'https://nsearchives.nseindia.com/corporate/a.pdf',
    );
  });

  it('prefixes a PDF path onto the NSE archive host', () => {
    expect(resolveNewsUrl('corporate/RELIANCE.pdf')).toBe(
      'https://nsearchives.nseindia.com/corporate/RELIANCE.pdf',
    );
  });

  it('falls back to the NSE quote page when there is no attachment', () => {
    expect(resolveNewsUrl(null, 'RELIANCE')).toBe(
      'https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE',
    );
  });
});
