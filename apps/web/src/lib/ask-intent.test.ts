import { isDeskAsk, tickerQuery } from './ask-intent';

describe('ask intent', () => {
  it('sends the default desk prompt to Today\'s Trade', () => {
    expect(isDeskAsk("Today's Best Trade")).toBe(true);
    expect(isDeskAsk('')).toBe(true);
    expect(tickerQuery("Today's Best Trade")).toBeNull();
  });

  it('treats a ticker as a stock lookup', () => {
    expect(isDeskAsk('EIHOTEL')).toBe(false);
    expect(tickerQuery('eihotel')).toBe('EIHOTEL');
    expect(tickerQuery('NRBBEARING')).toBe('NRBBEARING');
  });
});
