import { NextResponse } from 'next/server';
import { asError, failure, statusOf, success } from '@bloomstock/shared';
import { AppError } from '@bloomstock/core';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(success(data), { status });
}

export function jsonError(error: unknown) {
  const err = error instanceof AppError ? error : asError(error);
  return NextResponse.json(failure(err), { status: statusOf(err) });
}
