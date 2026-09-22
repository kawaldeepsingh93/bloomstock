import { AppError } from '@bloomstock/core';

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function failure(error: AppError | Error): ApiFailure {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }
  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message,
    },
  };
}

export function statusOf(error: unknown): number {
  if (error instanceof AppError) {
    return error.status;
  }
  return 500;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.hint, record.details]
      .filter((part): part is string => typeof part === 'string' && part.length > 0);
    if (parts.length > 0) return parts.join(' — ');
  }
  if (typeof error === 'string' && error.length > 0) return error;
  return 'Unexpected error';
}

export function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(errorMessage(error));
}
