import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireUser } from '@/server/auth';
import { getContainer } from '@/server/container';
import { settingsSchema } from '@/server/validation';

export async function GET() {
  try {
    const user = await requireUser();
    const { users } = getContainer();
    return jsonOk(await users.getProfile(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = parseBody(settingsSchema, await request.json());
    const { users } = getContainer();
    const profile = await users.updateProfile(user.id, {
      id: user.id,
      email: user.email ?? '',
      role: 'trader',
      ...body,
    });
    return jsonOk(profile);
  } catch (error) {
    return jsonError(error);
  }
}
