import { parseBody } from '@bloomstock/shared';
import { ValidationError } from '@bloomstock/core';
import { magicLinkSchema } from './validation';

describe('magicLinkSchema', () => {
  it('accepts a valid email', () => {
    expect(parseBody(magicLinkSchema, { email: 'buildwithkawal@gmail.com' })).toEqual({
      email: 'buildwithkawal@gmail.com',
    });
  });

  it('rejects an empty email', () => {
    expect(() => parseBody(magicLinkSchema, { email: '' })).toThrow(ValidationError);
  });
});
