import { UserRepository } from './user-repository';

describe('UserRepository.saveScan', () => {
  it('upserts named presets so Save can be clicked again', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const repo = new UserRepository({
      from: () => ({ upsert }),
    } as never);

    await repo.saveScan('user-1', { name: 'Momentum breakout', filters: { rsiMin: 55 } });
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        name: 'Momentum breakout',
        filters: { rsiMin: 55 },
      },
      { onConflict: 'user_id,name' },
    );
  });
});
