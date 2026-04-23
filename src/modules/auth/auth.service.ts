import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { compare, hash } from 'bcrypt';
import type { Request } from 'express';
import type { AppRole, PublicOnboardingRole } from '@constants/roles.constant';
import type { NewAuditLog, User } from '@database/drizzle/schema';
import {
  AccountDisabledException,
  DuplicateEmailException,
  ExternalApiException,
  InvalidCredentialsException,
  InvalidTokenException,
  MissingFieldException,
} from '@common/exceptions';
import { UsersRepository } from '@modules/users/users.repository';
import { SessionsService } from '@modules/sessions/sessions.service';
import { AuthRepository } from './auth.repository';
import { AuthGoogleOauthService } from './auth-google-oauth.service';
import { AuthTokensService } from './auth-tokens.service';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { AdminSignupDto } from './dto/admin-signup.dto';
import type { GoogleAuthDto } from './dto/google-auth.dto';
import type { LoginDto } from './dto/login.dto';
import type { OAuth2Provider } from './dto/oauth2-provider.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { SignupDto } from './dto/signup.dto';
import type { RequestUser } from '@/types';
import { getRequestIp } from './auth.utils';
import type {
  GoogleOauthPurpose,
  GoogleOauthStatePayload,
} from './auth-google-oauth.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsService: SessionsService,
    private readonly authRepository: AuthRepository,
    private readonly tokensService: AuthTokensService,
    private readonly googleOauthService: AuthGoogleOauthService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto, request: Request): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase();
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new DuplicateEmailException(email);
    }

    const requestedRole: PublicOnboardingRole = dto.role || 'creator';

    const passwordHash = await hash(dto.password, this.getBcryptRounds());
    const tenantId = await this.resolveTenantForSignup(
      requestedRole,
      dto.name,
      email,
    );

    const createdUser = await this.usersRepository.create({
      tenantId,
      email,
      name: dto.name,
      passwordHash,
      role: requestedRole,
      authProvider: 'local',
      isActive: true,
      isEmailVerified: false,
    });

    await this.usersRepository.createProfile({
      userId: createdUser.id,
      displayName: createdUser.name,
      bio: null,
      location: null,
      industry: null,
      websiteUrl: null,
      avatarUrl: null,
      audienceSize: 0,
      influenceScore: null,
      influenceScoreUpdatedAt: null,
    });

    await this.writeAuditLog({
      userId: createdUser.id,
      action: 'signup',
      entity: 'users',
      entityId: String(createdUser.id),
      metadata: {
        role: createdUser.role,
        tenantId: createdUser.tenantId,
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return this.tokensService.issueTokens(createdUser, request);
  }

  async adminSignup(
    dto: AdminSignupDto,
    request: Request,
  ): Promise<AuthResponseDto> {
    const expectedAdminSignupKey =
      this.configService.get<string>('ADMIN_SIGNUP_KEY');
    if (!expectedAdminSignupKey) {
      throw new MissingFieldException('ADMIN_SIGNUP_KEY');
    }

    // Constant-time comparison to prevent timing-based key discovery.
    // Hash both values to a fixed length so timingSafeEqual length requirement is met.
    const expectedBuf = Buffer.from(expectedAdminSignupKey);
    const providedBuf = Buffer.from(dto.adminSignupKey);
    const keysMatch =
      expectedBuf.length === providedBuf.length &&
      timingSafeEqual(expectedBuf, providedBuf);
    if (!keysMatch) {
      throw new InvalidCredentialsException({
        reason: 'invalid-admin-signup-key',
      });
    }

    const email = dto.email.toLowerCase();
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new DuplicateEmailException(email);
    }

    const passwordHash = await hash(dto.password, this.getBcryptRounds());
    const tenantId = await this.resolveAdminTenantId();

    const createdUser = await this.usersRepository.create({
      tenantId,
      email,
      name: dto.name,
      passwordHash,
      role: 'admin',
      authProvider: 'local',
      isActive: true,
      isEmailVerified: true,
    });

    await this.usersRepository.createProfile({
      userId: createdUser.id,
      displayName: createdUser.name,
      bio: null,
      location: null,
      industry: null,
      websiteUrl: null,
      avatarUrl: null,
      audienceSize: 0,
      influenceScore: null,
      influenceScoreUpdatedAt: null,
    });

    await this.writeAuditLog({
      userId: createdUser.id,
      action: 'signup',
      entity: 'users',
      entityId: String(createdUser.id),
      metadata: {
        role: createdUser.role,
        tenantId: createdUser.tenantId,
        flow: 'admin-signup',
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return this.tokensService.issueTokens(createdUser, request);
  }

  async login(dto: LoginDto, request: Request): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(
      dto.email.toLowerCase(),
    );
    if (!user?.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const validPassword = await compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new InvalidCredentialsException();
    }

    if (!user.isActive) {
      throw new AccountDisabledException({ userId: user.id });
    }

    if (user.role === 'admin') {
      throw new InvalidCredentialsException({
        reason: 'use-admin-login-endpoint',
      });
    }

    if (user.role === 'user') {
      throw new InvalidCredentialsException({
        reason: 'unsupported-role',
      });
    }

    await this.usersRepository.updateLastLogin(user.id);
    const tokenResponse = await this.tokensService.issueTokens(user, request);

    await this.writeAuditLog({
      userId: user.id,
      action: 'login',
      entity: 'users',
      entityId: String(user.id),
      metadata: {
        role: user.role,
        tenantId: user.tenantId,
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return tokenResponse;
  }

  async adminLogin(dto: LoginDto, request: Request): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(
      dto.email.toLowerCase(),
    );
    if (!user?.passwordHash || user.role !== 'admin') {
      throw new InvalidCredentialsException();
    }

    const validPassword = await compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new InvalidCredentialsException();
    }

    if (!user.isActive) {
      throw new AccountDisabledException({ userId: user.id });
    }

    await this.usersRepository.updateLastLogin(user.id);
    const tokenResponse = await this.tokensService.issueTokens(user, request);

    await this.writeAuditLog({
      userId: user.id,
      action: 'login',
      entity: 'users',
      entityId: String(user.id),
      metadata: {
        role: user.role,
        tenantId: user.tenantId,
        flow: 'admin-login',
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return tokenResponse;
  }

  async loginWithGoogle(
    dto: GoogleAuthDto,
    request: Request,
  ): Promise<AuthResponseDto> {
    const payload = await this.googleOauthService.verifyGoogleIdToken(
      dto.idToken,
    );

    const googleSubject = payload.sub;
    const email = String(payload.email || '').toLowerCase();
    const name = payload.name || 'Google User';

    if (!googleSubject || !email) {
      throw new InvalidTokenException({
        provider: 'google',
        reason: 'invalid-payload',
      });
    }

    let user: User | null = null;
    let createdNewUser = false;
    const existingOauth = await this.authRepository.findOauthAccount(
      'google',
      googleSubject,
    );
    if (existingOauth) {
      user = await this.usersRepository.findByIdOrNull(existingOauth.userId);
    } else {
      user = await this.usersRepository.findByEmail(email);
      if (!user) {
        const role: PublicOnboardingRole = dto.role || 'creator';
        const tenantId = await this.resolveTenantForSignup(role, name, email);
        user = await this.usersRepository.create({
          tenantId,
          email,
          name,
          passwordHash: null,
          role,
          authProvider: 'google',
          oauthProviderId: googleSubject,
          isActive: true,
          isEmailVerified: Boolean(payload.email_verified),
        });
        createdNewUser = true;

        await this.usersRepository.createProfile({
          userId: user.id,
          displayName: user.name,
          bio: null,
          location: null,
          industry: null,
          websiteUrl: null,
          avatarUrl: null,
          audienceSize: 0,
          influenceScore: null,
          influenceScoreUpdatedAt: null,
        });
      }

      await this.authRepository.createOauthAccount({
        userId: user.id,
        provider: 'google',
        providerUserId: googleSubject,
        email,
      });
    }

    if (!user) {
      throw new InvalidCredentialsException({ provider: 'google' });
    }

    if (!createdNewUser && dto.role && user.role !== dto.role) {
      throw new InvalidCredentialsException({
        reason: 'role-mismatch',
        provider: 'google',
      });
    }

    await this.usersRepository.markEmailVerified(user.id);
    await this.usersRepository.updateLastLogin(user.id);

    await this.writeAuditLog({
      userId: user.id,
      action: 'login',
      entity: 'oauth_accounts',
      entityId: googleSubject,
      metadata: {
        provider: 'google',
        tenantId: user.tenantId,
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    const latestUser =
      (await this.usersRepository.findByIdOrNull(user.id)) || user;
    return this.tokensService.issueTokens(latestUser, request);
  }

  async loginWithGoogleAuthorizationCode(
    code: string,
    request: Request,
    role: PublicOnboardingRole = 'creator',
  ): Promise<AuthResponseDto> {
    if (!code?.trim()) {
      throw new MissingFieldException('code');
    }

    try {
      const tokens =
        await this.googleOauthService.exchangeGoogleAuthorizationCode(
          code,
          this.googleOauthService.getGoogleLoginRedirectUri(),
        );

      // App login issues first-party JWTs. Persisting login-scoped Google API
      // tokens here can overwrite the YouTube integration grant for the same
      // Google account, so only the YouTube connect flow stores Google tokens.
      return this.loginWithGoogle(
        {
          idToken: tokens.idToken,
          role,
        },
        request,
      );
    } catch (error) {
      if (
        error instanceof MissingFieldException ||
        error instanceof InvalidTokenException
      ) {
        throw error;
      }

      if (this.googleOauthService.isGoogleInvalidGrantError(error)) {
        throw new InvalidTokenException({
          provider: 'google',
          reason: 'invalid-grant',
        });
      }

      this.logger.error(
        'Google OAuth authorization code exchange failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ExternalApiException('Google OAuth', {
        reason: 'token-exchange-failed',
      });
    }
  }

  async refresh(
    dto: RefreshTokenDto,
    request: Request,
  ): Promise<AuthResponseDto> {
    const decoded = this.tokensService.verifyRefreshToken(dto.refreshToken);
    const session = await this.sessionsService.findActiveSessionById(
      decoded.sid,
    );
    if (!session) {
      throw new InvalidTokenException({ reason: 'session-expired' });
    }

    const providedHash = this.tokensService.hashToken(dto.refreshToken);
    if (providedHash !== session.refreshTokenHash) {
      await this.sessionsService.revokeSessionById(session.id);
      throw new InvalidTokenException({ reason: 'refresh-token-mismatch' });
    }

    const user = await this.usersRepository.findByIdOrNull(decoded.sub);
    if (!user?.isActive) {
      throw new AccountDisabledException({ userId: decoded.sub });
    }

    await this.sessionsService.revokeSessionById(session.id);
    const nextTokenPair = await this.tokensService.issueTokens(user, request);

    await this.writeAuditLog({
      userId: user.id,
      action: 'refresh',
      entity: 'sessions',
      entityId: session.id,
      metadata: {
        replacedByNewSession: true,
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return nextTokenPair;
  }

  async logout(
    userId: number,
    sessionId: string,
    request: Request,
  ): Promise<{ success: boolean }> {
    await this.sessionsService.revokeSessionById(sessionId);

    await this.writeAuditLog({
      userId,
      action: 'logout',
      entity: 'sessions',
      entityId: sessionId,
      metadata: {},
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return { success: true };
  }

  async verifySession(
    userId: number,
    tenantId: number,
    sessionId: string,
    email: string,
    role: AppRole,
    request: Request,
  ) {
    const session = await this.sessionsService.findActiveSessionById(sessionId);
    if (session?.userId !== userId) {
      throw new InvalidTokenException({ reason: 'session-invalid' });
    }

    await this.writeAuditLog({
      userId,
      action: 'verify',
      entity: 'sessions',
      entityId: sessionId,
      metadata: {},
      ipAddress: getRequestIp(request),
      userAgent: request.headers['user-agent'] || null,
    });

    return {
      valid: true,
      userId,
      tenantId,
      email,
      role,
      sessionId,
    };
  }

  prepareOauth2(provider: OAuth2Provider) {
    return this.googleOauthService.prepareOauth2(provider);
  }

  prepareGoogleOauth(
    provider: OAuth2Provider,
    options: {
      purpose: GoogleOauthPurpose;
      role?: PublicOnboardingRole;
      actor?: RequestUser;
    },
  ) {
    return this.googleOauthService.prepareGoogleOauth(provider, options);
  }

  parseOauthState(state: string): GoogleOauthStatePayload {
    return this.googleOauthService.parseOauthState(state);
  }

  async connectGoogleYoutubeAuthorizationCode(
    code: string,
    actor: RequestUser,
  ): Promise<{ providerUserId: string; email: string | null }> {
    return this.googleOauthService.connectGoogleYoutubeAuthorizationCode(
      code,
      actor,
    );
  }

  async refreshGoogleOauthTokensForUser(
    targetUserId: number,
    actor: RequestUser,
  ): Promise<{ accessToken: string; tokenExpiresAt: Date | null }> {
    return this.googleOauthService.refreshGoogleOauthTokensForUser(
      targetUserId,
      actor,
    );
  }

  private async resolveTenantForSignup(
    role: PublicOnboardingRole,
    displayName: string,
    email: string,
  ): Promise<number> {
    if (role === 'sme' || role === 'creator') {
      const preferredSlugBase = this.slugify(
        displayName || email.split('@')[0] || role,
      );
      const preferredSlug = `${preferredSlugBase}-${role}`;
      const existing =
        await this.usersRepository.findTenantBySlug(preferredSlug);
      if (existing) {
        return existing.id;
      }

      const createdTenant = await this.usersRepository.createTenant({
        name: `${displayName || role} Workspace`,
        slug: preferredSlug,
        isActive: true,
      });
      return createdTenant.id;
    }

    const publicTenantSlug = 'public-tenant';
    const publicTenant =
      await this.usersRepository.findTenantBySlug(publicTenantSlug);
    if (publicTenant) {
      return publicTenant.id;
    }

    const created = await this.usersRepository.createTenant({
      name: 'Public Tenant',
      slug: publicTenantSlug,
      isActive: true,
    });
    return created.id;
  }

  private async resolveAdminTenantId(): Promise<number> {
    const adminTenantSlug = 'platform-admin';
    const existing =
      await this.usersRepository.findTenantBySlug(adminTenantSlug);
    if (existing) {
      return existing.id;
    }

    const created = await this.usersRepository.createTenant({
      name: 'Platform Admin',
      slug: adminTenantSlug,
      isActive: true,
    });
    return created.id;
  }

  private async writeAuditLog(log: NewAuditLog): Promise<void> {
    await this.authRepository.createAuditLog(log);
  }

  private getBcryptRounds(): number {
    const rounds = Number(
      this.configService.get<string>('BCRYPT_ROUNDS') || '10',
    );
    return Number.isFinite(rounds) ? rounds : 10;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '')
      .slice(0, 40);
  }
}
