import { jsonError, jsonOk } from '@/server/http';
import { requireUser } from '@/server/auth';
import { getContainer } from '@/server/container';

export async function GET() {
  try {
    await requireUser();
    const { secrets } = getContainer();
    const connected = await secrets.exists('kite_access_token');
    return jsonOk({ connected });
  } catch (error) {
    return jsonError(error);
  }
}
