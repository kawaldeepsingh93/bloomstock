import { enforceRateLimit } from './rate-limit';
import { RateLimitError } from '@bloomstock/core';

describe('enforceRateLimit', () => {
  it('trips after the max requests in the window', async () => {
    await expect(enforceRateLimit('unit-test-async', 2, 60_000)).resolves.toBeUndefined();
    await expect(enforceRateLimit('unit-test-async', 2, 60_000)).resolves.toBeUndefined();
    await expect(enforceRateLimit('unit-test-async', 2, 60_000)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });
});
