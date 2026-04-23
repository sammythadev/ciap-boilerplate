import {
  InvalidTokenException,
  InsufficientPermissionsException,
} from '@common/exceptions';
import type { RequestUser } from '@/types';
import { SocialsService } from './socials.service';
import { YoutubeMetricsQueryDto } from './dto/youtube-metrics-query.dto';

describe('SocialsService', () => {
  it('returns oauth2-link-required details when stored Google token lacks YouTube scopes', async () => {
    const authService = {
      prepareGoogleOauth: jest.fn().mockReturnValue({
        authorizationUrl:
          'https://accounts.google.com/o/oauth2/v2/auth?youtube=1',
        redirectUri: 'http://localhost:3000/ingestion/youtube/oauth2/callback',
        purpose: 'youtube-connect',
      }),
      refreshGoogleOauthTokensForUser: jest.fn(),
      parseOauthState: jest.fn(),
    } as never;

    const authRepository = {
      findOauthAccountByUserAndProvider: jest.fn().mockResolvedValue({
        id: 7,
        userId: 23,
        provider: 'google',
        providerUserId: 'google-sub-123',
        email: 'creator@example.com',
        accessToken: 'login-scope-token',
        refreshToken: 'login-refresh-token',
        tokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    } as never;

    const usersRepository = {
      findByIdOrNull: jest.fn().mockResolvedValue({
        id: 23,
        tenantId: 8,
        email: 'creator@example.com',
      }),
    } as never;

    const service = new SocialsService(
      authService,
      authRepository,
      usersRepository,
    );

    jest.spyOn(service as never, 'fetchGoogleJson').mockRejectedValueOnce(
      new InsufficientPermissionsException(
        'youtube.readonly + yt-analytics.readonly',
        {
          provider: 'google',
          reason: 'insufficientPermissions',
          googleError: {
            error: {
              status: 'PERMISSION_DENIED',
            },
          },
        },
      ),
    );

    const actor: RequestUser = {
      id: 23,
      email: 'creator@example.com',
      role: 'creator',
      tenantId: 8,
      sessionId: 'session-1',
    };
    const query = new YoutubeMetricsQueryDto();

    let thrown: unknown;
    try {
      await service.getYoutubeMetrics(actor, query);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(InvalidTokenException);
    expect((thrown as InvalidTokenException).getResponse()).toEqual(
      expect.objectContaining({
        details: expect.objectContaining({
          action: 'oauth2-link-required',
          reason: 'insufficient-youtube-scopes',
          authorizationUrl:
            'https://accounts.google.com/o/oauth2/v2/auth?youtube=1',
        }),
      }),
    );
  });
});
