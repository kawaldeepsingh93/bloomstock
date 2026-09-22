import { serializeLogValue } from './logger';

describe('serializeLogValue', () => {
  it('keeps Error message and name', () => {
    expect(serializeLogValue(new Error('Kite token missing'))).toMatchObject({
      name: 'Error',
      message: 'Kite token missing',
    });
  });

  it('keeps a PostgREST-shaped object instead of [object Object]', () => {
    expect(
      serializeLogValue({
        message: 'permission denied for table vendor_secrets',
        code: '42501',
        details: null,
        hint: null,
      }),
    ).toMatchObject({
      message: 'permission denied for table vendor_secrets',
      code: '42501',
    });
  });

  it('does not strip logger payloads that also have a message', () => {
    const payload = {
      ts: '2026-09-18T20:42:40.045Z',
      level: 'error',
      scope: 'api-worker',
      message: 'Worker failed',
      error: { message: 'Kite access token missing', code: 'CONFIGURATION_ERROR' },
    };
    expect(serializeLogValue(payload)).toBe(payload);
  });
});
