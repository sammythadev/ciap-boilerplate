import { HealthController } from './health.controller';
import type { HealthService } from './health.service';

describe('HealthController', () => {
  const healthService = {
    check: jest.fn(),
    checkDatabase: jest.fn(),
    checkCache: jest.fn(),
    readiness: jest.fn(),
  } as unknown as HealthService;

  const controller = new HealthController(healthService);

  beforeEach(() => {
    healthService.check.mockReset();
    healthService.checkDatabase.mockReset();
    healthService.checkCache.mockReset();
    healthService.readiness.mockReset();
  });

  it('returns api health summary', () => {
    const payload = { status: 'ok', timestamp: 'now' };
    healthService.check.mockReturnValue(payload as never);

    expect(controller.check()).toEqual(payload);
    expect(healthService.check).toHaveBeenCalledTimes(1);
  });

  it('returns database health status', async () => {
    const payload = { status: 'ok', timestamp: 'now', database: 'connected' };
    healthService.checkDatabase.mockResolvedValue(payload as never);

    await expect(controller.checkDb()).resolves.toEqual(payload);
    expect(healthService.checkDatabase).toHaveBeenCalledTimes(1);
  });

  it('returns cache health status', async () => {
    const payload = { status: 'ok', timestamp: 'now', cache: 'connected' };
    healthService.checkCache.mockResolvedValue(payload as never);

    await expect(controller.checkCache()).resolves.toEqual(payload);
    expect(healthService.checkCache).toHaveBeenCalledTimes(1);
  });

  it('returns readiness status', async () => {
    const payload = { status: 'ok', timestamp: 'now', ready: true };
    healthService.readiness.mockResolvedValue(payload as never);

    await expect(controller.readiness()).resolves.toEqual(payload);
    expect(healthService.readiness).toHaveBeenCalledTimes(1);
  });
});
