import { morningStateFromGithub, morningStatusMessage } from './morning-job';

describe('morningStateFromGithub', () => {
  it('keeps an in-flight Action as running', () => {
    expect(morningStateFromGithub(null, 'in_progress')).toBe('running');
    expect(morningStateFromGithub(null, 'queued')).toBe('running');
  });

  it('maps a completed Action to success or failure', () => {
    expect(morningStateFromGithub('success', 'completed')).toBe('success');
    expect(morningStateFromGithub('failure', 'completed')).toBe('failure');
    expect(morningStateFromGithub('timed_out', 'completed')).toBe('failure');
  });
});

describe('morningStatusMessage', () => {
  it('tells the desk when the background job is done', () => {
    expect(morningStatusMessage('success', 'local')).toContain('finished');
    expect(morningStatusMessage('failure', 'github')).toContain('failed');
  });
});
