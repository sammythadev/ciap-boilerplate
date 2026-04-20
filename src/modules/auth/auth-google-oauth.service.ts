import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  JsonWebTokenError,
  TokenExpiredError,
  sign,
  verify,
} from 'jsonwebtoken';
import type { Algorithm } from 'jsonwebtoken';
import {
  ExternalApiException,
  InvalidCredentialsException,
  InvalidEnumException,
  InvalidTokenException,
  MissingFieldException,
} from '@common/exceptions';
import type { PublicOnboardingRole } from '@constants/roles.constant';
import type { OauthAccount } from '@database/drizzle/schema';
import { UsersRepository } from '@modules/users/users.repository';
import { AuthRepository } from './auth.repository';
import { AuthTokensService } from './auth-tokens.service';
import type { OAuth2Provider } from './dto/oauth2-provider.dto';
import type { RequestUser } from '@/types';

export type GoogleTokenExchangePayload = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date | null;
};

export type GoogleOauthPurpose = 'login' | 'youtube-connect';

export type GoogleOauthStatePayload = {
  purpose: GoogleOauthPurpose;
  role?: PublicOnboardingRole;
  sub?: number;
  tenantId?: number;
};

@Injectable()
export class AuthGoogleOauthService {
  private readonly logger = new Logger(AuthGoogleOauthService.name);
  private oauthClient?: OAuth2Client;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly tokensService: AuthTokensService,
    private readonly configService: ConfigService,
  ) {}

  prepareOauth2(provider: OAuth2Provider) {
    if (provider !== 'google') {
      throw new InvalidEnumException('provider', ['google'], {
        providedValue: provider,
      });
    }

    return this.prepareGoogleOauth(provider, { purpose: 'login' });
  }

  prepareGoogleOauth(
    provider: OAuth2Provider,
    options: {
      purpose: GoogleOauthPurpose;
      role?: PublicOnboardingRole;
      actor?: RequestUser;
    },
  ) {
    if (provider !== 'google') {
      throw new InvalidEnumException('provider', ['google'], {
        providedValue: provider,
      });
    }

    const client = this.getGoogleClient();
    const isYoutubeConnect = options.purpose === 'youtube-connect';

    if (isYoutubeConnect && !options.actor) {
      throw new MissingFieldException('actor');
    }

    const redirectUri = isYoutubeConnect
      ? this.getGoogleYoutubeRedirectUri()
      : this.getGoogleLoginRedirectUri();

    const scopes = isYoutubeConnect
      ? [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/yt-analytics.readonly',
        ]
      : ['openid', 'email', 'profile'];

    const state = this.buildOauthState({
      purpose: options.purpose,
      role: options.role,
      sub: options.actor?.id,
      tenantId: options.actor?.tenantId,
    });

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      redirect_uri: redirectUri,
      prompt: 'consent',
      state,
    });

    return {
      provider,
      redirectUri,
      authorizationUrl: url,
      purpose: options.purpose,
    };
  }

  parseOauthState(state: string): GoogleOauthStatePayload {
    try {
      const decoded = verify(state, this.tokensService.getAccessPublicKey(), {
        algorithms: ['ES256' satisfies Algorithm],
      });

      if (!decoded || typeof decoded !== 'object') {
        throw new InvalidTokenException({ reason: 'invalid-oauth-state' });
      }

      const payload = decoded as GoogleOauthStatePayload;
      if (!payload.purpose) {
        throw new InvalidTokenException({ reason: 'missing-oauth-purpose' });
      }

      return payload;
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw error;
      }
      if (
        error instanceof JsonWebTokenError ||
        error instanceof TokenExpiredError
      ) {
        throw new InvalidTokenException({ reason: 'invalid-oauth-state' });
      }
      throw error;
    }
  }

  async connectGoogleYoutubeAuthorizationCode(
    code: string,
    actor: RequestUser,
  ): Promise<{ providerUserId: string; email: string | null }> {
    if (!code?.trim()) {
      throw new MissingFieldException('code');
    }

    try {
      const tokens = await this.exchangeGoogleAuthorizationCode(
        code,
        this.getGoogleYoutubeRedirectUri(),
      );
      const identity = await this.resolveGoogleIdentity(tokens.idToken);

      await this.upsertGoogleOauthAccount(actor, identity, tokens);

      return { providerUserId: identity.providerUserId, email: identity.email };
    } catch (error) {
      if (
        error instanceof MissingFieldException ||
        error instanceof InvalidTokenException
      ) {
        throw error;
      }

      if (this.isGoogleInvalidGrantError(error)) {
        throw new InvalidTokenException({
          provider: 'google',
          reason: 'invalid-grant',
        });
      }

      this.logger.error(
        'Google OAuth authorization code exchange failed (YouTube connect)',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ExternalApiException('Google OAuth', {
        reason: 'token-exchange-failed',
      });
    }
  }

  async refreshGoogleOauthTokensForUser(
    targetUserId: number,
    actor: RequestUser,
  ): Promise<{ accessToken: string; tokenExpiresAt: Date | null }> {
    if (actor.role !== 'admin' && actor.id !== targetUserId) {
      throw new InvalidCredentialsException({
        reason: 'cross-user-google-token-refresh-forbidden',
      });
    }

    if (actor.role !== 'admin' && actor.id === targetUserId) {
      const actorRecord = await this.usersRepository.findByIdOrNull(actor.id);
      if (!actorRecord || actorRecord.tenantId !== actor.tenantId) {
        throw new InvalidCredentialsException({
          reason: 'tenant-context-mismatch',
        });
      }
    }

    const oauthAccount =
      await this.authRepository.findOauthAccountByUserAndProvider(
        targetUserId,
        'google',
      );
    if (!oauthAccount) {
      throw new InvalidTokenException({
        provider: 'google',
        reason: 'oauth-account-not-found',
      });
    }

    if (!oauthAccount.refreshToken) {
      throw new InvalidTokenException({
        provider: 'google',
        reason: 'missing-refresh-token',
      });
    }

    try {
      // Create a fresh client per request to avoid race conditions when
      // concurrent callers share a singleton with setCredentials() state.
      const freshClient = new OAuth2Client(
        this.getGoogleClientId(),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      );
      freshClient.setCredentials({
        refresh_token: oauthAccount.refreshToken,
      });

      const { credentials } = await freshClient.refreshAccessToken();
      const accessToken = credentials.access_token ?? oauthAccount.accessToken;

      if (!accessToken) {
        throw new InvalidTokenException({
          provider: 'google',
          reason: 'missing-access-token',
        });
      }

      const tokenExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : oauthAccount.tokenExpiresAt;
      const refreshToken =
        credentials.refresh_token ?? oauthAccount.refreshToken;

      await this.authRepository.updateOauthAccountTokens(oauthAccount.id, {
        accessToken,
        refreshToken,
        tokenExpiresAt,
      });

      return {
        accessToken,
        tokenExpiresAt,
      };
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw error;
      }

      if (this.isGoogleInvalidGrantError(error)) {
        throw new InvalidTokenException({
          provider: 'google',
          reason: 'invalid-grant',
        });
      }

      throw new ExternalApiException('Google OAuth', {
        reason: 'refresh-token-exchange-failed',
      });
    }
  }

  async exchangeGoogleAuthorizationCode(
    code: string,
    redirectUri: string,
  ): Promise<{
    idToken: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
  }> {
    const client = this.getGoogleClient();
    const { tokens } = await client.getToken({
      code,
      redirect_uri: redirectUri,
    });

    if (!tokens.id_token) {
      throw new InvalidTokenException({
        provider: 'google',
        reason: 'missing-id-token',
      });
    }

    return {
      idToken: tokens.id_token,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
  }

  async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.getGoogleClient().verifyIdToken({
        idToken,
        audience: this.getGoogleClientId(),
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new InvalidTokenException({ provider: 'google' });
      }
      return payload;
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw error;
      }
      throw new ExternalApiException('Google OAuth', {
        reason: 'token-verification-failed',
      });
    }
  }

  async saveGoogleOauthTokens(
    oauthAccount: OauthAccount | null,
    googleTokens: GoogleTokenExchangePayload | undefined,
    email: string,
  ): Promise<void> {
    if (!oauthAccount) {
      return;
    }

    if (!googleTokens?.accessToken && !googleTokens?.refreshToken) {
      return;
    }

    let tokenExpiresAt = googleTokens.expiresAt ?? oauthAccount.tokenExpiresAt;
    if (googleTokens.expiresAt === null) {
      tokenExpiresAt = null;
    }

    await this.authRepository.updateOauthAccountTokens(oauthAccount.id, {
      accessToken: googleTokens.accessToken ?? oauthAccount.accessToken,
      refreshToken: googleTokens.refreshToken ?? oauthAccount.refreshToken,
      tokenExpiresAt,
      email,
    });
  }

  isGoogleInvalidGrantError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as {
      message?: unknown;
      response?: {
        data?: {
          error?: unknown;
        };
      };
    };

    if (candidate.response?.data?.error === 'invalid_grant') {
      return true;
    }

    return (
      typeof candidate.message === 'string' &&
      candidate.message.includes('invalid_grant')
    );
  }

  getGoogleLoginRedirectUri(): string {
    return (
      this.configService.get<string>('GOOGLE_LOGIN_REDIRECT_URI') ||
      'http://localhost:3000/auth/socials/google/login/callback'
    );
  }

  getGoogleYoutubeRedirectUri(): string {
    return (
      this.configService.get<string>('GOOGLE_YOUTUBE_REDIRECT_URI') ||
      'http://localhost:3000/ingestion/youtube/oauth2/callback'
    );
  }

  private async resolveGoogleIdentity(idToken: string): Promise<{
    providerUserId: string;
    email: string | null;
  }> {
    const payload = await this.verifyGoogleIdToken(idToken);
    const providerUserId = String(payload.sub || '').trim();
    const email = payload.email ? String(payload.email).toLowerCase() : null;

    if (!providerUserId) {
      throw new InvalidTokenException({
        provider: 'google',
        reason: 'missing-provider-user-id',
      });
    }

    return { providerUserId, email };
  }

  private async upsertGoogleOauthAccount(
    actor: RequestUser,
    identity: { providerUserId: string; email: string | null },
    tokens: {
      accessToken: string | null;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
  ): Promise<void> {
    const existingAccount = await this.authRepository.findOauthAccount(
      'google',
      identity.providerUserId,
    );

    if (existingAccount && existingAccount.userId !== actor.id) {
      throw new InvalidTokenException({
        provider: 'google',
        reason: 'oauth-account-already-linked',
      });
    }

    const oauthAccount =
      existingAccount ||
      (await this.authRepository.findOauthAccountByUserAndProvider(
        actor.id,
        'google',
      ));

    if (oauthAccount) {
      await this.authRepository.updateOauthAccountTokens(oauthAccount.id, {
        accessToken: tokens.accessToken ?? oauthAccount.accessToken,
        refreshToken: tokens.refreshToken ?? oauthAccount.refreshToken,
        tokenExpiresAt: tokens.expiresAt ?? oauthAccount.tokenExpiresAt,
        email: identity.email ?? oauthAccount.email,
      });
      return;
    }

    await this.authRepository.createOauthAccount({
      userId: actor.id,
      provider: 'google',
      providerUserId: identity.providerUserId,
      email: identity.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    });
  }

  private buildOauthState(payload: GoogleOauthStatePayload): string {
    return sign(payload, this.tokensService.getAccessPrivateKey(), {
      algorithm: 'ES256',
      expiresIn: '10m',
    });
  }

  private getGoogleClientId(): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new MissingFieldException('GOOGLE_CLIENT_ID');
    }
    return clientId;
  }

  private getGoogleRedirectUri(): string {
    return this.getGoogleLoginRedirectUri();
  }

  private getGoogleClient(): OAuth2Client {
    if (!this.oauthClient) {
      this.oauthClient = new OAuth2Client(
        this.getGoogleClientId(),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
        this.getGoogleRedirectUri(),
      );
    }

    return this.oauthClient;
  }
}
