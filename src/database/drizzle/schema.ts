import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  serial,
  jsonb,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
  bigint,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'user',
  'sme',
  'creator',
]);
export const authProviderEnum = pgEnum('auth_provider', [
  'local',
  'google',
  'github',
  'linkedin',
]);
export const auditActionEnum = pgEnum('audit_action', [
  'signup',
  'login',
  'verify',
  'refresh',
  'logout',
  'update_profile',
  'role_change',
]);
export const contentPlatformEnum = pgEnum('content_platform', [
  'youtube',
  'tiktok',
  'instagram',
  'other',
]);

/**
 * Tenants Table
 * Core multitenancy boundary for tenant-scoped resources.
 */
export const tenants = pgTable(
  'tenants',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    tenantsSlugIdx: index('tenants_slug_idx').on(table.slug),
  }),
);

/**
 * Users Table
 * Core user entity with authentication and profile information
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()

      .references(() => tenants.id, { onDelete: 'restrict' }),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash'),
    role: userRoleEnum('role').notNull().default('user'),
    authProvider: authProviderEnum('auth_provider').notNull().default('local'),
    oauthProviderId: text('oauth_provider_id'),
    isActive: boolean('is_active').notNull().default(true),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    usersEmailIdx: index('users_email_idx').on(table.email),
    usersRoleIdx: index('users_role_idx').on(table.role),
    usersTenantIdx: index('users_tenant_id_idx').on(table.tenantId),
    usersOauthIdentityUq: uniqueIndex('users_oauth_identity_uq').on(
      table.authProvider,
      table.oauthProviderId,
    ),
  }),
);

/**
 * OAuth Accounts Table
 * Supports one user linking multiple OAuth providers over time.
 */
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    email: text('email'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    oauthUserIdx: index('oauth_accounts_user_id_idx').on(table.userId),
    oauthProviderIdx: index('oauth_accounts_provider_idx').on(table.provider),
    oauthProviderIdentityUq: uniqueIndex(
      'oauth_accounts_provider_identity_uq',
    ).on(table.provider, table.providerUserId),
  }),
);

/**
 * Sessions Table
 * Stores refresh token sessions for revocation and lifecycle management.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    sessionsUserIdx: index('sessions_user_id_idx').on(table.userId),
    sessionsExpiresIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

/**
 * Audit Logs Table
 * Tracks security and business-sensitive operations.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: auditActionEnum('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    metadata: jsonb('metadata'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    auditLogsUserIdx: index('audit_logs_user_id_idx').on(table.userId),
    auditLogsActionIdx: index('audit_logs_action_idx').on(table.action),
    auditLogsCreatedIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

/**
 * YouTube Channels Table
 * Normalized YouTube channel data for growth tracking and analytics.
 */
export const youtubeChannels = pgTable(
  'youtube_channels',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    youtubeChannelId: text('youtube_channel_id').notNull().unique(),
    channelTitle: text('channel_title'),
    channelDescription: text('channel_description'),
    thumbnailUrl: text('thumbnail_url'),
    subscriberCount: integer('subscriber_count').default(0),
    videoCount: integer('video_count').default(0),
    totalViewCount: bigint('total_view_count', { mode: 'number' }).default(0),
    uploadPlaylistId: text('upload_playlist_id'),
    isApproved: boolean('is_approved').notNull().default(false),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    youtubeChannelUserIdx: index('youtube_channels_user_id_idx').on(
      table.userId,
    ),
    youtubeChannelIdIdx: index('youtube_channels_youtube_id_idx').on(
      table.youtubeChannelId,
    ),
  }),
);

/**
 * YouTube Videos Table
 * Normalized video metadata for content intelligence (engagement, duration, metrics).
 */
export const youtubeVideos = pgTable(
  'youtube_videos',
  {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id')
      .notNull()
      .references(() => youtubeChannels.id, { onDelete: 'cascade' }),
    youtubeVideoId: text('youtube_video_id').notNull().unique(),
    videoTitle: text('video_title'),
    videoDescription: text('video_description'),
    durationSeconds: integer('duration_seconds'),
    viewCount: integer('view_count').default(0),
    likeCount: integer('like_count').default(0),
    commentCount: integer('comment_count').default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    youtubeVideoChannelIdx: index('youtube_videos_channel_id_idx').on(
      table.channelId,
    ),
    youtubeVideoIdIdx: index('youtube_videos_youtube_id_idx').on(
      table.youtubeVideoId,
    ),
    youtubeVideoPublishedIdx: index('youtube_videos_published_at_idx').on(
      table.publishedAt,
    ),
  }),
);

/**
 * YouTube Daily Analytics Table
 * Time-series metrics for growth tracking, engagement analysis, and ML feature engineering.
 * Captured per sync request; designed for efficient time-range queries and aggregations.
 */
export const youtubeDailyAnalytics = pgTable(
  'youtube_daily_analytics',
  {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id')
      .notNull()
      .references(() => youtubeChannels.id, { onDelete: 'cascade' }),
    analyticsDate: timestamp('analytics_date', {
      withTimezone: true,
    }).notNull(),
    views: integer('views').default(0),
    estimatedMinutesWatched: integer('estimated_minutes_watched').default(0),
    averageViewDurationSeconds: real('average_view_duration_seconds').default(
      0,
    ),
    subscribersGained: integer('subscribers_gained').default(0),
    subscribersLost: integer('subscribers_lost').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    youtubeDailyAnalyticsChannelIdx: index(
      'youtube_daily_analytics_channel_id_idx',
    ).on(table.channelId),
    youtubeDailyAnalyticsDateIdx: index('youtube_daily_analytics_date_idx').on(
      table.analyticsDate,
    ),
    youtubeDailyAnalyticsChannelDateUq: uniqueIndex(
      'youtube_daily_analytics_channel_date_uq',
    ).on(table.channelId, table.analyticsDate),
  }),
);

/**
 * YouTube ML Scores Table
 * Content performance and recommendation scores computed by ML pipeline.
 * One record per video per scoring run; used for ranking and recommendations.
 */
export const youtubeMlScores = pgTable(
  'youtube_ml_scores',
  {
    id: serial('id').primaryKey(),
    videoId: integer('video_id')
      .notNull()
      .references(() => youtubeVideos.id, { onDelete: 'cascade' }),
    engagementScore: real('engagement_score').notNull(),
    growthScore: real('growth_score').notNull(),
    recommendationScore: real('recommendation_score').notNull(),
    performanceRank: integer('performance_rank'),
    scoredAt: timestamp('scored_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    jobId: text('job_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    youtubeMlVideoUq: uniqueIndex('youtube_ml_scores_video_id_uq').on(
      table.videoId,
    ),
    youtubeMlJobIdx: index('youtube_ml_scores_job_id_idx').on(table.jobId),
    youtubeMlScoredAtIdx: index('youtube_ml_scores_scored_at_idx').on(
      table.scoredAt,
    ),
  }),
);

/**
 * User Profiles Table
 * Holds extended profile data and creator influence score.
 */
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name'),
    bio: text('bio'),
    location: text('location'),
    industry: text('industry'),
    websiteUrl: text('website_url'),
    avatarUrl: text('avatar_url'),
    audienceSize: integer('audience_size').default(0),
    influenceScore: real('influence_score'),
    influenceScoreUpdatedAt: timestamp('influence_score_updated_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    userProfilesUserIdx: uniqueIndex('user_profiles_user_id_uq').on(
      table.userId,
    ),
    userProfilesInfluenceIdx: index('user_profiles_influence_idx').on(
      table.influenceScore,
    ),
  }),
);

/**
 * Content Items Table
 * Cross-platform normalized content records.
 */
export const contentItems = pgTable(
  'content_items',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: contentPlatformEnum('platform').notNull(),
    externalId: text('external_id'),
    title: text('title'),
    description: text('description'),
    url: text('url'),
    thumbnailUrl: text('thumbnail_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    contentItemsUserIdx: index('content_items_user_id_idx').on(table.userId),
    contentItemsPlatformIdx: index('content_items_platform_idx').on(
      table.platform,
    ),
    contentItemsExternalUq: uniqueIndex(
      'content_items_platform_external_uq',
    ).on(table.platform, table.externalId),
  }),
);

/**
 * Content Metrics Table
 * Normalized metric values for creators and content items.
 */
export const contentMetrics = pgTable(
  'content_metrics',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentItemId: integer('content_item_id').references(
      () => contentItems.id,
      {
        onDelete: 'cascade',
      },
    ),
    platform: contentPlatformEnum('platform').notNull(),
    metricName: text('metric_name').notNull(),
    metricValue: real('metric_value').notNull().default(0),
    metricUnit: text('metric_unit'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    contentMetricsUserIdx: index('content_metrics_user_id_idx').on(
      table.userId,
    ),
    contentMetricsItemIdx: index('content_metrics_item_id_idx').on(
      table.contentItemId,
    ),
    contentMetricsNameIdx: index('content_metrics_name_idx').on(
      table.metricName,
    ),
    contentMetricsRecordedIdx: index('content_metrics_recorded_idx').on(
      table.recordedAt,
    ),
  }),
);

/**
 * Content Conversions Table
 * Normalized conversion outcomes for creators and content items.
 */
export const contentConversions = pgTable(
  'content_conversions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentItemId: integer('content_item_id').references(
      () => contentItems.id,
      {
        onDelete: 'cascade',
      },
    ),
    platform: contentPlatformEnum('platform').notNull(),
    conversionType: text('conversion_type').notNull(),
    conversionCount: integer('conversion_count').notNull().default(0),
    conversionValue: real('conversion_value'),
    currency: text('currency'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    contentConversionsUserIdx: index('content_conversions_user_id_idx').on(
      table.userId,
    ),
    contentConversionsItemIdx: index('content_conversions_item_id_idx').on(
      table.contentItemId,
    ),
    contentConversionsTypeIdx: index('content_conversions_type_idx').on(
      table.conversionType,
    ),
  }),
);

/**
 * Relations
 */
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  oauthAccounts: many(oauthAccounts),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  contentItems: many(contentItems),
  contentMetrics: many(contentMetrics),
  contentConversions: many(contentConversions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const youtubeChannelsRelations = relations(
  youtubeChannels,
  ({ one, many }) => ({
    user: one(users, {
      fields: [youtubeChannels.userId],
      references: [users.id],
    }),
    videos: many(youtubeVideos),
    dailyAnalytics: many(youtubeDailyAnalytics),
  }),
);

export const youtubeVideosRelations = relations(
  youtubeVideos,
  ({ one, many }) => ({
    channel: one(youtubeChannels, {
      fields: [youtubeVideos.channelId],
      references: [youtubeChannels.id],
    }),
    mlScores: many(youtubeMlScores),
  }),
);

export const youtubeDailyAnalyticsRelations = relations(
  youtubeDailyAnalytics,
  ({ one }) => ({
    channel: one(youtubeChannels, {
      fields: [youtubeDailyAnalytics.channelId],
      references: [youtubeChannels.id],
    }),
  }),
);

export const youtubeMlScoresRelations = relations(
  youtubeMlScores,
  ({ one }) => ({
    video: one(youtubeVideos, {
      fields: [youtubeMlScores.videoId],
      references: [youtubeVideos.id],
    }),
  }),
);

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const contentItemsRelations = relations(
  contentItems,
  ({ one, many }) => ({
    user: one(users, {
      fields: [contentItems.userId],
      references: [users.id],
    }),
    metrics: many(contentMetrics),
    conversions: many(contentConversions),
  }),
);

export const contentMetricsRelations = relations(contentMetrics, ({ one }) => ({
  user: one(users, {
    fields: [contentMetrics.userId],
    references: [users.id],
  }),
  contentItem: one(contentItems, {
    fields: [contentMetrics.contentItemId],
    references: [contentItems.id],
  }),
}));

export const contentConversionsRelations = relations(
  contentConversions,
  ({ one }) => ({
    user: one(users, {
      fields: [contentConversions.userId],
      references: [users.id],
    }),
    contentItem: one(contentItems, {
      fields: [contentConversions.contentItemId],
      references: [contentItems.id],
    }),
  }),
);

/**
 * Type Exports
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type OauthAccount = typeof oauthAccounts.$inferSelect;
export type NewOauthAccount = typeof oauthAccounts.$inferInsert;
export type YoutubeChannel = typeof youtubeChannels.$inferSelect;
export type NewYoutubeChannel = typeof youtubeChannels.$inferInsert;
export type YoutubeVideo = typeof youtubeVideos.$inferSelect;
export type NewYoutubeVideo = typeof youtubeVideos.$inferInsert;
export type YoutubeDailyAnalytics = typeof youtubeDailyAnalytics.$inferSelect;
export type NewYoutubeDailyAnalytics =
  typeof youtubeDailyAnalytics.$inferInsert;
export type YoutubeMlScore = typeof youtubeMlScores.$inferSelect;
export type NewYoutubeMlScore = typeof youtubeMlScores.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
export type ContentMetric = typeof contentMetrics.$inferSelect;
export type NewContentMetric = typeof contentMetrics.$inferInsert;
export type ContentConversion = typeof contentConversions.$inferSelect;
export type NewContentConversion = typeof contentConversions.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
