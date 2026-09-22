import { ValidationError } from '@bloomstock/core';
import type { ZodSchema } from 'zod';

export function parseBody<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Request validation failed', result.error.flatten());
  }
  return result.data;
}
