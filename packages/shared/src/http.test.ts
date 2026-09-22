import { asError, errorMessage } from './http';

describe('errorMessage', () => {
  it('reads a PostgREST-shaped object instead of Unexpected error', () => {
    expect(
      errorMessage({
        message: 'JSON could not be generated',
        hint: 'Add a filter',
        details: null,
        code: 'PGRST002',
      }),
    ).toBe('JSON could not be generated — Add a filter');
  });
});

describe('asError', () => {
  it('wraps a plain object so route handlers can instanceof Error', () => {
    const err = asError({ message: 'permission denied for table ohlcv', code: '42501' });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('permission denied');
  });
});
