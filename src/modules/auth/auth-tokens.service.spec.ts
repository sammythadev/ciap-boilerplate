import { AuthTokensService } from './auth-tokens.service';
import type { SessionsService } from '@modules/sessions/sessions.service';
import type { ConfigService } from '@nestjs/config';
import type { User } from '@database/drizzle/schema';
import type { Request } from 'express';
import {
  InvalidTokenException,
  TokenExpiredException,
} from '@common/exceptions';
import {
  sign,
  verify,
  TokenExpiredError,
  JsonWebTokenError,
} from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return {
    ...actual,
    sign: jest.fn(() => 'signed-token'),
    verify: jest.fn(() => ({ sub: 1, sid: 'session-1', tenantId: 10 })),
  };
});

describe('AuthTokensService', () => {
  const sessionsService = {
    createSession: jest.fn(),
  } as unknown as SessionsService;

  const configMap: Record<string, string> = {
    JWT_ACCESS_PUBLIC_KEY: 'access-public',
    JWT_ACCESS_PRIVATE_KEY: 'access-private',
    JWT_REFRESH_PUBLIC_KEY: 'refresh-public',
    JWT_REFRESH_PRIVATE_KEY: 'refresh-private',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };

  const configService = {
    get: jest.fn((key: string) => configMap[key]),
  } as unknown as ConfigService;

  let service: AuthTokensService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthTokensService(sessionsService, configService);
  });

  it('issues access and refresh tokens', async () => {
    const user: User = {
      id: 1,
      tenantId: 10,
      email: 'creator@example.com',
      name: 'Creator',
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

    const request = {
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    } as Request;

    const result = await service.issueTokens(user, request);

    expect(sign).toHaveBeenCalledTimes(2);
    expect(sessionsService.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        ipAddress: '127.0.0.1',
      }),
    );
    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
  });

  it('parses refresh token payload', () => {
    (verify as jest.Mock).mockReturnValue({
      sub: 1,
      sid: 'session-1',
      tenantId: 10,
    });

    const payload = service.verifyRefreshToken('refresh-token');

    expect(payload).toEqual({ sub: 1, sid: 'session-1', tenantId: 10 });
  });

  it('throws when refresh token payload is invalid', () => {
    (verify as jest.Mock).mockReturnValue({});

    expect(() => service.verifyRefreshToken('refresh-token')).toThrow(
      InvalidTokenException,
    );
  });

  it('throws token expired exception when refresh token is expired', () => {
    (verify as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError('expired', new Date());
    });

    expect(() => service.verifyRefreshToken('refresh-token')).toThrow(
      TokenExpiredException,
    );
  });

  it('throws invalid token exception on JWT parse errors', () => {
    (verify as jest.Mock).mockImplementation(() => {
      throw new JsonWebTokenError('invalid');
    });

    expect(() => service.verifyRefreshToken('refresh-token')).toThrow(
      InvalidTokenException,
    );
  });
});
