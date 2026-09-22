import { isNseCashEquity, kiteErrorMessage } from './kite-instruments';

describe('isNseCashEquity', () => {
  const base = {
    tradingsymbol: 'RELIANCE',
    name: 'Reliance',
    instrument_token: 1,
    instrument_type: 'EQ',
    segment: 'NSE',
    exchange: 'NSE',
    lot_size: 1,
    tick_size: 0.05,
  };

  it('keeps NSE cash equities', () => {
    expect(isNseCashEquity(base)).toBe(true);
  });

  it('drops index names such as NIFTY 50', () => {
    expect(
      isNseCashEquity({
        ...base,
        tradingsymbol: 'NIFTY 50',
        name: 'NIFTY 50',
        segment: 'INDICES',
      }),
    ).toBe(false);
  });

  it('drops F&O contracts', () => {
    expect(
      isNseCashEquity({
        ...base,
        tradingsymbol: 'RELIANCE26FEBFUT',
        instrument_type: 'FUT',
        segment: 'NFO-FUT',
        exchange: 'NFO',
      }),
    ).toBe(false);
  });

  it('drops SME, T2T, and state-govt bonds', () => {
    expect(isNseCashEquity({ ...base, tradingsymbol: 'GOLDSTAR-SM' })).toBe(false);
    expect(isNseCashEquity({ ...base, tradingsymbol: 'GATECHDVR-BE' })).toBe(false);
    expect(isNseCashEquity({ ...base, tradingsymbol: '656KA30-SG' })).toBe(false);
  });

  it('keeps hyphenated cash names such as BAJAJ-AUTO', () => {
    expect(isNseCashEquity({ ...base, tradingsymbol: 'BAJAJ-AUTO' })).toBe(true);
  });
});

describe('kiteErrorMessage', () => {
  it('reads a Kite API object instead of Unknown market data failure', () => {
    expect(
      kiteErrorMessage({
        message: 'Too many requests',
        error_type: 'TokenException',
        status: 429,
      }),
    ).toContain('Too many requests');
  });

  it('keeps a normal Error message', () => {
    expect(kiteErrorMessage(new Error('Incorrect access_token'))).toBe('Incorrect access_token');
  });
});
