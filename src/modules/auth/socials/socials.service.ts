import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { AuthRepository } from '@modules/auth/auth.repository';
import { AuthService } from '@modules/auth/auth.service';
import { UsersRepository } from '@modules/users/users.repository';
import {
  ExternalApiException,
  InsufficientPermissionsException,
  InvalidTokenException,
  ValidationException,
  YoutubeChannelNotFoundException,
} from '@common/exceptions';
import type { RequestUser } from '@/types';
import type { AuthResponseDto } from '@modules/auth/dto/auth-response.dto';
import type { GoogleAuthDto } from '@modules/auth/dto/google-auth.dto';
import type { YoutubeMetricsQueryDto } from './dto/youtube-metrics-query.dto';
import {
  buildYoutubeMetricsPullJobPayload,
  YOUTUBE_METRICS_PULL_JOB,
  YOUTUBE_METRICS_QUEUE,
} from './youtube-metrics.job';

type YoutubeChannelResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: Record<string, { url?: string }>;
      [key: string]: unknown;
    };
    statistics?: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
      [key: string]: unknown;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  }>;
};

type YoutubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
};

type YoutubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      [key: string]: unknown;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
      [key: string]: unknown;
    };
    contentDetails?: {
      duration?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
};

type YoutubeAnalyticsRow = [string, ...number[]]; // date + metrics
type YoutubeAnalyticsResponse = {
  columnHeaders?: Array<{
    name?: string;
    columnType?: string;
    dataType?: string;
  }>;
  rows?: YoutubeAnalyticsRow[];
};

@Injectable()
export class SocialsService {
  private readonly logger = new Logger(SocialsService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async loginWithGoogle(
    dto: GoogleAuthDto,
    request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithGoogle(dto, request);
  }

  async loginWithGoogleAuthorizationCode(
    code: string,
    request: Request,
    state?: string,
  ): Promise<AuthResponseDto> {
    const role = this.resolveLoginRole(state);
    return this.authService.loginWithGoogleAuthorizationCode(
      code,
      request,
      role,
    );
  }

  prepareGoogleOauth2Login(role?: 'sme' | 'creator') {
    return this.authService.prepareGoogleOauth('google', {
      purpose: 'login',
      role,
    });
  }

  prepareGoogleOauth2Youtube(actor: RequestUser) {
    return this.authService.prepareGoogleOauth('google', {
      purpose: 'youtube-connect',
      actor,
    });
  }

  async connectGoogleYoutubeAuthorizationCode(
    code: string,
    state: string,
  ): Promise<RequestUser> {
    const oauthState = this.authService.parseOauthState(state);

    if (oauthState.purpose !== 'youtube-connect') {
      throw new InvalidTokenException({ reason: 'invalid-oauth-purpose' });
    }

    const userId = Number(oauthState.sub || 0);
    const tenantId = Number(oauthState.tenantId || 0);
    if (!userId || !tenantId) {
      throw new InvalidTokenException({ reason: 'invalid-oauth-state' });
    }

    const user = await this.usersRepository.findByIdOrNull(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new InvalidTokenException({ reason: 'oauth-user-not-found' });
    }

    await this.authService.connectGoogleYoutubeAuthorizationCode(code, {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      sessionId: 'oauth-connect',
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      sessionId: 'oauth-connect',
    };
  }

  async refreshGoogleOauthTokens(
    actor: RequestUser,
  ): Promise<{ tokenExpiresAt: Date | null }> {
    const refreshed = await this.authService.refreshGoogleOauthTokensForUser(
      actor.id,
      actor,
    );
    return {
      tokenExpiresAt: refreshed.tokenExpiresAt,
    };
  }

  async getYoutubeMetrics(actor: RequestUser, query: YoutubeMetricsQueryDto) {
    const actorRecord = await this.usersRepository.findByIdOrNull(actor.id);
    if (!actorRecord || actorRecord.tenantId !== actor.tenantId) {
      throw new InvalidTokenException({ reason: 'tenant-context-mismatch' });
    }

    const days = query.days ?? 30;
    const maxVideos = Math.min(query.maxVideos ?? 10, 10);

    const accessToken = await this.resolveGoogleAccessToken(actor);

    let channel: YoutubeChannelResponse;
    let channelItem:
      | NonNullable<YoutubeChannelResponse['items']>[number]
      | null;
    let videos: YoutubeVideosResponse;

    try {
      channel = await this.fetchGoogleJson<YoutubeChannelResponse>(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
        accessToken,
      );
      channelItem = channel.items?.[0] ?? null;
      if (!channelItem) {
        throw new YoutubeChannelNotFoundException({ reason: 'no-channel' });
      }
      if (!channelItem.id) {
        throw new ValidationException(
          'YouTube channel ID is missing; reconnect Google OAuth.',
          { reason: 'missing-channel-id' },
        );
      }

      const searchResult = await this.fetchGoogleJson<YoutubeSearchResponse>(
        `https://www.googleapis.com/youtube/v3/search?part=id&forMine=true&type=video&order=date&maxResults=${maxVideos}`,
        accessToken,
      );

      const videoIds = (searchResult.items || [])
        .map((item) => item.id?.videoId)
        .filter((value): value is string => Boolean(value));

      videos = videoIds.length
        ? await this.fetchGoogleJson<YoutubeVideosResponse>(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}`,
            accessToken,
          )
        : { items: [] };
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        throw this.buildGoogleOauthRequiredException(
          'insufficient-youtube-scopes',
          actor,
          {
            requiredScopes: [
              'https://www.googleapis.com/auth/youtube.readonly',
              'https://www.googleapis.com/auth/yt-analytics.readonly',
            ],
            ...error.details,
          },
        );
      }

      throw error;
    }

    let analytics = { columnHeaders: [], rows: [] } as YoutubeAnalyticsResponse;
    let analyticsStatus: 'success' | 'warning' = 'success';
    let analyticsWarning: string | null = null;

    try {
      analytics = await this.fetchAnalyticsReport(accessToken, days);
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        analyticsStatus = 'warning';
        analyticsWarning =
          'YouTube Analytics data is unavailable for this account. Channel analytics access may be missing.';
      } else {
        throw error;
      }
    }

    return {
      channel: channelItem,
      videos: videos.items || [],
      analytics,
      analyticsStatus,
      analyticsWarning,
      limits: {
        days,
        maxVideos,
      },
      // Prepared payload contract for later BullMQ integration.
      bullmq: {
        queue: YOUTUBE_METRICS_QUEUE,
        jobName: YOUTUBE_METRICS_PULL_JOB,
        payload: buildYoutubeMetricsPullJobPayload({
          userId: actor.id,
          tenantId: actor.tenantId,
          days,
          maxVideos,
        }),
      },
    };
  }

  getYoutubeMetricsJobPayload(
    actor: RequestUser,
    query: YoutubeMetricsQueryDto,
  ) {
    const days = query.days ?? 30;
    const maxVideos = Math.min(query.maxVideos ?? 10, 10);

    return {
      queue: YOUTUBE_METRICS_QUEUE,
      jobName: YOUTUBE_METRICS_PULL_JOB,
      payload: buildYoutubeMetricsPullJobPayload({
        userId: actor.id,
        tenantId: actor.tenantId,
        days,
        maxVideos,
      }),
    };
  }

  private async resolveGoogleAccessToken(actor: RequestUser): Promise<string> {
    const oauthAccount =
      await this.authRepository.findOauthAccountByUserAndProvider(
        actor.id,
        'google',
      );
    if (!oauthAccount) {
      throw this.buildGoogleOauthRequiredException(
        'oauth-account-not-found',
        actor,
      );
    }

    const now = Date.now();
    const currentAccessToken = oauthAccount.accessToken;
    const tokenExpiresAt = oauthAccount.tokenExpiresAt;
    if (
      currentAccessToken &&
      (!tokenExpiresAt || tokenExpiresAt.getTime() - now > 30_000)
    ) {
      return currentAccessToken;
    }

    if (!oauthAccount.refreshToken) {
      throw this.buildGoogleOauthRequiredException(
        'missing-refresh-token',
        actor,
      );
    }

    const refreshed = await this.authService.refreshGoogleOauthTokensForUser(
      actor.id,
      actor,
    );
    return refreshed.accessToken;
  }

  private async fetchAnalyticsReport(
    accessToken: string,
    days: number,
  ): Promise<YoutubeAnalyticsResponse> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));

    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);

    const query = new URLSearchParams({
      ids: 'channel==MINE',
      startDate: start,
      endDate: end,
      metrics:
        'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares',
      dimensions: 'day',
      sort: 'day',
      maxResults: '90',
    });

    return this.fetchGoogleJson<YoutubeAnalyticsResponse>(
      `https://youtubeanalytics.googleapis.com/v2/reports?${query.toString()}`,
      accessToken,
    );
  }

  private async fetchGoogleJson<T>(
    url: string,
    accessToken: string,
  ): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await this.parseGoogleErrorBody(response);
      const reason =
        this.resolveGoogleErrorReason(errorBody) ||
        `google-api-${response.status}`;

      this.logger.warn(
        `Google API request failed: ${response.status} ${reason} (${url})`,
      );
      if (response.status === 401) {
        throw new InvalidTokenException({
          provider: 'google',
          reason,
          googleError: errorBody,
        });
      }

      if (response.status === 403) {
        throw new InsufficientPermissionsException(
          'youtube.readonly + yt-analytics.readonly',
          {
            provider: 'google',
            reason,
            googleError: errorBody,
          },
        );
      }

      throw new ExternalApiException('Google APIs', {
        status: response.status,
        reason,
        googleError: errorBody,
      });
    }

    return (await response.json()) as T;
  }

  private async parseGoogleErrorBody(
    response: globalThis.Response,
  ): Promise<unknown> {
    const raw = await response.text();
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }

  private resolveGoogleErrorReason(errorBody: unknown): string | null {
    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const root = errorBody as {
      error?: {
        message?: unknown;
        status?: unknown;
        errors?: Array<{
          reason?: unknown;
        }>;
      };
    };

    const firstReason = root.error?.errors?.[0]?.reason;
    if (typeof firstReason === 'string' && firstReason.trim()) {
      return firstReason;
    }

    if (typeof root.error?.status === 'string' && root.error.status.trim()) {
      return root.error.status;
    }

    if (typeof root.error?.message === 'string' && root.error.message.trim()) {
      return root.error.message;
    }

    return null;
  }

  private buildGoogleOauthRequiredException(
    reason: string,
    actor: RequestUser,
    extraDetails?: Record<string, unknown>,
  ): InvalidTokenException {
    const oauthHint = this.prepareGoogleOauth2Youtube(actor);
    const safeExtraDetails = { ...(extraDetails ?? {}) };
    delete safeExtraDetails.reason;

    return new InvalidTokenException({
      provider: 'google',
      reason,
      action: 'oauth2-link-required',
      authorizationUrl: oauthHint.authorizationUrl,
      redirectUri: oauthHint.redirectUri,
      ...safeExtraDetails,
    });
  }

  private resolveLoginRole(state?: string): 'sme' | 'creator' {
    if (!state) {
      return 'creator';
    }

    const payload = this.authService.parseOauthState(state);
    if (payload.purpose !== 'login') {
      return 'creator';
    }

    return payload.role === 'sme' ? 'sme' : 'creator';
  }
}
