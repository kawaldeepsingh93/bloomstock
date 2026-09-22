type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const rank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export function serializeLogValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as Error & { code?: unknown }).code
        ? { code: (value as Error & { code?: unknown }).code }
        : {},
    };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.message === 'string' && record.scope === undefined && record.ts === undefined) {
      return {
        message: record.message,
        code: record.code,
        details: record.details,
        hint: record.hint,
        error_type: record.error_type,
        status: record.status,
      };
    }
  }
  return value;
}

export function createLogger(scope: string, level: LogLevel = 'info'): Logger {
  const write = (current: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (rank[current] < rank[level]) {
      return;
    }
    const payload = {
      ts: new Date().toISOString(),
      level: current,
      scope,
      message,
      ...meta,
    };
    const line = JSON.stringify(payload, (_key, value) => serializeLogValue(value));
    if (current === 'error') {
      console.error(line);
      return;
    }
    if (current === 'warn') {
      console.warn(line);
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(line);
    }
  };

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  };
}
