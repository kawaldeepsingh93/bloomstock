import { createLogger } from '@bloomstock/shared';
import { runMorningJob } from './jobs/morning';

const log = createLogger('api-worker');
const command = process.argv[2] ?? 'morning';

async function main() {
  if (command === 'morning' || command === 'job:morning') {
    await runMorningJob();
    return;
  }
  throw new Error(`Unknown worker command ${command}`);
}

main().catch((error) => {
  log.error('Worker failed', { error });
  process.exit(1);
});
