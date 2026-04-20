import { Injectable, Logger } from '@nestjs/common';
import type {
  YoutubeChannel,
  YoutubeVideo,
  YoutubeDailyAnalytics,
} from '@database/drizzle/schema';
import { RedisCacheService } from '@modules/cache/redis-cache.service';

/**
 * YouTube metrics cache service with TTL-based storage.
 * Caches normalized, database-ready data for fast retrieval.
 * Delegates to RedisCacheService for all cache operations.
 *
 * YouTube module owns this cache implementation.
 */
@Injectable()
export class YoutubeCacheService {
  private readonly logger = new Logger(YoutubeCacheService.name);
  private readonly ttlHours: number;
  private readonly prefix = 'youtube';

  constructor(private readonly redisCache: RedisCacheService) {
    this.ttlHours = 2; // Default YouTube cache TTL in hours
  }

  /**
   * Store normalized channel data in cache.
   * TTL automatically set to YOUTUBE_CACHE_TTL_HOURS.
   */
  async setChannel(channel: YoutubeChannel): Promise<void> {
    const key = this.getChannelKey(channel.youtubeChannelId);

    try {
      await this.redisCache.set(key, channel, this.ttlHours);
      this.logger.debug(
        `Cached channel ${channel.youtubeChannelId} with TTL ${this.ttlHours}h`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache channel ${channel.youtubeChannelId}:`,
        error,
      );
    }
  }

  /**
   * Retrieve cached channel by YouTube channel ID.
   * Returns null if not found or expired.
   */
  async getChannel(youtubeChannelId: string): Promise<YoutubeChannel | null> {
    const key = this.getChannelKey(youtubeChannelId);

    try {
      return await this.redisCache.get<YoutubeChannel>(key);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve cached channel ${youtubeChannelId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Store normalized videos in cache.
   * Stores as individual video keys for fine-grained invalidation.
   */
  async setVideos(
    youtubeChannelId: string,
    videos: YoutubeVideo[],
  ): Promise<void> {
    for (const video of videos) {
      const key = this.getVideoKey(youtubeChannelId, video.youtubeVideoId);

      try {
        await this.redisCache.set(key, video, this.ttlHours);
      } catch (error) {
        this.logger.error(
          `Failed to cache video ${video.youtubeVideoId} for channel ${youtubeChannelId}:`,
          error,
        );
      }
    }

    this.logger.debug(
      `Cached ${videos.length} videos for channel ${youtubeChannelId} with TTL ${this.ttlHours}h`,
    );
  }

  /**
   * Retrieve cached video by YouTube video ID.
   * Returns null if not found or expired.
   */
  async getVideo(
    youtubeChannelId: string,
    youtubeVideoId: string,
  ): Promise<YoutubeVideo | null> {
    const key = this.getVideoKey(youtubeChannelId, youtubeVideoId);

    try {
      return await this.redisCache.get<YoutubeVideo>(key);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve cached video ${youtubeVideoId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Retrieve all cached videos for a channel (by key pattern).
   * Note: Returns empty array in memory-only mode (pattern matching requires Redis).
   */
  getChannelVideos(youtubeChannelId: string): YoutubeVideo[] {
    // Pattern matching not supported through generic cache-manager interface
    // Would require direct Redis access for KEYS command
    this.logger.debug(
      `Pattern video retrieval for ${youtubeChannelId} requires direct Redis access`,
    );
    return [];
  }

  /**
   * Store normalized daily analytics in cache.
   * Stores as a single key per channel for efficient retrieval.
   */
  async setAnalytics(
    youtubeChannelId: string,
    analytics: YoutubeDailyAnalytics[],
  ): Promise<void> {
    const key = this.getAnalyticsKey(youtubeChannelId);

    try {
      await this.redisCache.set(key, analytics, this.ttlHours);
      this.logger.debug(
        `Cached ${analytics.length} analytics records for channel ${youtubeChannelId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache analytics for channel ${youtubeChannelId}:`,
        error,
      );
    }
  }

  /**
   * Retrieve cached analytics for a channel.
   * Returns empty array if not found or expired.
   */
  async getAnalytics(
    youtubeChannelId: string,
  ): Promise<YoutubeDailyAnalytics[]> {
    const key = this.getAnalyticsKey(youtubeChannelId);

    try {
      const analytics = await this.redisCache.get<YoutubeDailyAnalytics[]>(key);
      return analytics ?? [];
    } catch (error) {
      this.logger.error(
        `Failed to retrieve cached analytics ${youtubeChannelId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Invalidate all cached data for a channel.
   * Call immediately after successful data sync to clear stale data.
   */
  async invalidateChannel(youtubeChannelId: string): Promise<void> {
    try {
      const channelKey = this.getChannelKey(youtubeChannelId);
      const analyticsKey = this.getAnalyticsKey(youtubeChannelId);

      await Promise.all([
        this.redisCache.delete(channelKey),
        this.redisCache.delete(analyticsKey),
        this.redisCache.deletePattern(
          this.getVideoKeyPattern(youtubeChannelId),
        ),
      ]);

      this.logger.debug(`Invalidated cache for channel ${youtubeChannelId}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for channel ${youtubeChannelId}:`,
        error,
      );
    }
  }

  /**
   * Invalidate specific video cache.
   * Use when only video metadata changes, not entire channel.
   */
  async invalidateVideo(
    youtubeChannelId: string,
    youtubeVideoId: string,
  ): Promise<void> {
    const key = this.getVideoKey(youtubeChannelId, youtubeVideoId);

    try {
      await this.redisCache.delete(key);
      this.logger.debug(`Invalidated cache for video ${youtubeVideoId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate video ${youtubeVideoId}:`, error);
    }
  }

  /**
   * Cache approval status for a YouTube channel.
   * Marks channel as approved for analytics tracking.
   */
  async setChannelApproved(youtubeChannelId: string): Promise<void> {
    const key = this.getChannelApprovalKey(youtubeChannelId);
    const approvalData = {
      approved: true,
      approvedAt: new Date().toISOString(),
    };

    try {
      // 7 days TTL for approval status
      await this.redisCache.set(key, approvalData, 7 * 24);
      this.logger.debug(
        `Cached approval status for channel ${youtubeChannelId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache approval status for channel ${youtubeChannelId}:`,
        error,
      );
    }
  }

  /**
   * Check if a YouTube channel is marked as approved in cache.
   */
  async isChannelApproved(youtubeChannelId: string): Promise<boolean> {
    const key = this.getChannelApprovalKey(youtubeChannelId);

    try {
      const approval = await this.redisCache.get<Record<string, unknown>>(key);
      return approval !== null;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve approval status for ${youtubeChannelId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Health check: verify cache is operational.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${this.prefix}:health`;
      await this.redisCache.set(testKey, { ok: true }, 1);
      await this.redisCache.delete(testKey);
      return true;
    } catch (error) {
      this.logger.error(`Cache health check failed: ${String(error)}`);
      return false;
    }
  }

  // Key generation helpers
  private getChannelKey(youtubeChannelId: string): string {
    return `${this.prefix}:channel:${youtubeChannelId}`;
  }

  private getVideoKeyPattern(youtubeChannelId: string): string {
    return `${this.prefix}:video:${youtubeChannelId}:*`;
  }

  private getVideoKey(
    youtubeChannelId: string,
    youtubeVideoId: string,
  ): string {
    return `${this.prefix}:video:${youtubeChannelId}:${youtubeVideoId}`;
  }

  private getAnalyticsKey(youtubeChannelId: string): string {
    return `${this.prefix}:analytics:${youtubeChannelId}`;
  }

  private getChannelApprovalKey(youtubeChannelId: string): string {
    return `${this.prefix}:approved:${youtubeChannelId}`;
  }
}
