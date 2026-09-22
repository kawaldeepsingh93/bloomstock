import { envValue, loadConfig } from './config';
import { sanitizeInstrumentLots } from './instruments';
import { AppError, ValidationError } from './errors';
import { err, ok, unwrap } from './result';

describe('loadConfig', () => {
  it('applies production defaults for risk and model', () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    expect(config.OPENAI_MODEL).toBe('gpt-5');
    expect(config.DEFAULT_CAPITAL).toBe(100_000);
    expect(config.DEFAULT_RISK_PERCENT).toBe(1);
  });

  it('rejects invalid risk percent', () => {
    expect(() => loadConfig({ DEFAULT_RISK_PERCENT: '12' })).toThrow();
  });
});

describe('envValue', () => {
  it('returns undefined for missing or empty values', () => {
    expect(envValue('MISSING_BLOOMSTOCK_KEY', {})).toBeUndefined();
    expect(envValue('EMPTY', { EMPTY: '' })).toBeUndefined();
    expect(envValue('SET', { SET: 'https://example.supabase.co' })).toBe('https://example.supabase.co');
  });
});

describe('sanitizeInstrumentLots', () => {
  it('replaces zero Kite index lots and ticks with cash-market defaults', () => {
    expect(sanitizeInstrumentLots(0, 0)).toEqual({ lotSize: 1, tickSize: 0.05 });
    expect(sanitizeInstrumentLots(25, 0.05)).toEqual({ lotSize: 25, tickSize: 0.05 });
  });
});

describe('errors', () => {
  it('maps validation errors to 422', () => {
    const error = new ValidationError('bad payload', { field: 'symbol' });
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('result', () => {
  it('unwraps success and throws failure', () => {
    expect(unwrap(ok(4))).toBe(4);
    expect(() => unwrap(err(new Error('fail')))).toThrow('fail');
  });
});
