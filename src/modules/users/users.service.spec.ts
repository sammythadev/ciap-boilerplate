import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';
import type { User } from '@database/drizzle/schema';
import type { RequestUser } from '@/types';
import {
  InvalidTokenException,
  UnauthorizedUserActionException,
  UserNotFoundException,
} from '@common/exceptions';

describe('UsersService', () => {
  const repository = {
    findById: jest.fn(),
    findByIdAndTenant: jest.fn(),
    findByEmail: jest.fn(),
    findAllByTenant: jest.fn(),
    findAll: jest.fn(),
  } as unknown as UsersRepository;

  const baseUser: User = {
    id: 1,
    tenantId: 10,
    email: 'user@example.com',
    name: 'User One',
    passwordHash: null,
    role: 'creator',
    authProvider: 'local',
    oauthProviderId: null,
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: null,
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new UsersService(repository);
  });

  it('returns user for admin lookup', async () => {
    repository.findById.mockResolvedValue(baseUser);

    const actor: RequestUser = {
      id: 99,
      email: 'admin@example.com',
      role: 'admin',
      tenantId: 99,
      sessionId: 'session-1',
    };

    const result = await service.getUserById(1, actor);

    expect(repository.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        email: 'user@example.com',
        tenantId: 10,
      }),
    );
  });

  it('uses tenant lookup for non-admin users', async () => {
    repository.findByIdAndTenant.mockResolvedValue(baseUser);

    const actor: RequestUser = {
      id: 1,
      email: 'creator@example.com',
      role: 'creator',
      tenantId: 10,
      sessionId: 'session-1',
    };

    await service.getUserById(1, actor);

    expect(repository.findByIdAndTenant).toHaveBeenCalledWith(1, 10);
  });

  it('throws when user not found', async () => {
    repository.findById.mockResolvedValue(undefined);

    const actor: RequestUser = {
      id: 99,
      email: 'admin@example.com',
      role: 'admin',
      tenantId: 99,
      sessionId: 'session-1',
    };

    await expect(service.getUserById(123, actor)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it('prevents creators from accessing other users', async () => {
    repository.findByIdAndTenant.mockResolvedValue({
      ...baseUser,
      id: 2,
    });

    const actor: RequestUser = {
      id: 1,
      email: 'creator@example.com',
      role: 'creator',
      tenantId: 10,
      sessionId: 'session-1',
    };

    await expect(service.getUserById(2, actor)).rejects.toBeInstanceOf(
      UnauthorizedUserActionException,
    );
  });

  it('requires actor for tenant users lookup', async () => {
    await expect(service.getTenantUsers()).rejects.toBeInstanceOf(
      InvalidTokenException,
    );
  });

  it('returns tenant users list', async () => {
    repository.findAllByTenant.mockResolvedValue([baseUser]);

    const actor: RequestUser = {
      id: 1,
      email: 'creator@example.com',
      role: 'creator',
      tenantId: 10,
      sessionId: 'session-1',
    };

    const result = await service.getTenantUsers(10, 0, actor);

    expect(repository.findAllByTenant).toHaveBeenCalledWith(10, 10, 0);
    expect(result).toHaveLength(1);
  });

  it('returns users list for admin endpoint', async () => {
    repository.findAll.mockResolvedValue([baseUser]);

    const result = await service.getAllUsersForAdmin(10, 0);

    expect(repository.findAll).toHaveBeenCalledWith(10, 0);
    expect(result).toHaveLength(1);
  });
});
