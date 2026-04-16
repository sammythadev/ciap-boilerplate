import { HealthService } from './health.service';
import { Logger } from '@nestjs/common';
import type { RedisCacheService } from '@modules/cache/redis-cache.service';

describe('HealthService', () => {
  const db = {
    execute: jest.fn(),
  };

  const cache = {
    healthCheck: jest.fn(),
  } as unknown as RedisCacheService;

  let service: HealthService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    db.execute.mockReset();
    cache.healthCheck.mockReset();
    service = new HealthService(db as never, cache);
  });

  it('returns api health summary', () => {
    const result = service.check();

    expect(result).toEqual(
      expect.objectContaining({
        status: 'ok',
        version: '1.0.0',
      }),
    );
  });

  it('returns ok when database is reachable', async () => {
    db.execute.mockResolvedValue({});

    const result = await service.checkDatabase();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
  });

  it('returns error when database check fails', async () => {
    db.execute.mockRejectedValue(new Error('db down'));

    const result = await service.checkDatabase();

    expect(result.status).toBe('error');
    expect(result.database).toBe('disconnected');
    expect(result.error).toBe('db down');
  });

  it('returns ok when cache is reachable', async () => {
    cache.healthCheck.mockResolvedValue(true);

    const result = await service.checkCache();

    expect(result.status).toBe('ok');
    expect(result.cache).toBe('connected');
  });

  it('returns error when cache check fails', async () => {
    cache.healthCheck.mockResolvedValue(false);

    const result = await service.checkCache();

    expect(result.status).toBe('error');
    expect(result.cache).toBe('disconnected');
  });

  it('returns ok when readiness checks pass', async () => {
    jest.spyOn(service, 'checkDatabase').mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'ok',
      database: 'connected',
    });
    jest.spyOn(service, 'checkCache').mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'ok',
      cache: 'connected',
    });

    const result = await service.readiness();

    expect(result.ready).toBe(true);
    expect(result.status).toBe('ok');
  });
});
