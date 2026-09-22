import { jsonError, jsonOk } from '@/server/http';
import { getContainer } from '@/server/container';

export async function GET() {
  try {
    const { market } = getContainer();
    return jsonOk(await market.listIpos());
  } catch (error) {
    return jsonError(error);
  }
}
