import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireUser } from '@/server/auth';
import { getContainer } from '@/server/container';
import { scanRequestSchema } from '@/server/validation';
import { z } from 'zod';

const savedScanSchema = z.object({
  name: z.string().min(1),
  filters: scanRequestSchema.shape.filters.unwrap(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const { users } = getContainer();
    return jsonOk(await users.listSavedScans(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = parseBody(savedScanSchema, await request.json());
    const { users } = getContainer();
    await users.saveScan(user.id, { name: body.name, filters: body.filters ?? {} });
    return jsonOk({ saved: true }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
