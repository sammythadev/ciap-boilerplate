import { Injectable, Logger } from '@nestjs/common';
import type {
  YoutubeChannel,
  YoutubeVideo,
  YoutubeDailyAnalytics,
} from '@database/drizzle/schema';

/**
 * Normalized ingestion data ready for database storage and ML processing.
 * All string values converted to typed numbers, ISO durations parsed to seconds.
 */
export type NormalizedYoutubeChannel = Omit<
  YoutubeChannel,
  'id' | 'createdAt' | 'updatedAt' | 'lastSyncedAt'
> & {
  youtubeChannelId: string;
  channelTitle: string | null;
  channelDescription: string | null;
};

export type NormalizedYoutubeVideo = Omit<
  YoutubeVideo,
  'id' | 'createdAt' | 'updatedAt' | 'lastSyncedAt' | 'channelId'
> & {
  youtubeVideoId: string;
  id?: never; // mark as unsupported at this layer
};

export type NormalizedYoutubeDailyAnalytics = Omit<
  YoutubeDailyAnalytics,
  'id' | 'createdAt'
> & {
  channelId: number; // must be set by caller after channel insert
};

@Injectable()
export class YoutubeNormalizationService {
  private readonly logger = new Logger(YoutubeNormalizationService.name);

  /**
   * Normalize raw YouTube channel to database schema.
   * Converts string statistics to integers.
   */
  normalizeChannel(
    youtubeChannelId: string,
    raw: {
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: Record<string, object>;
      };
      statistics?: {
        subscriberCount?: string;
        viewCount?: string;
        videoCount?: string;
      };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    } | null,
    userId: number,
  ): NormalizedYoutubeChannel | null {
    if (!raw || !raw.snippet) {
      this.logger.warn(`Channel ${youtubeChannelId} missing snippet data`);
      return null;
    }

    const stats = raw.statistics || {};
    const thumbnail = this.getThumbnailUrl(raw.snippet.thumbnails);
    const uploadPlaylist = raw.contentDetails?.relatedPlaylists?.uploads;

    return {
      userId,
      youtubeChannelId,
      channelTitle: raw.snippet.title || null,
      channelDescription: raw.snippet.description || null,
      thumbnailUrl: thumbnail,
      subscriberCount: this.parseStringInt(stats.subscriberCount),
      videoCount: this.parseStringInt(stats.videoCount),
      totalViewCount: Number(this.parseStringBigInt(stats.viewCount)),
      uploadPlaylistId: uploadPlaylist || null,
      isApproved: false,
      approvedAt: null,
    };
  }

  /**
   * Normalize raw YouTube videos to database schema.
   * Extracts engagement metrics and parses ISO8601 duration to seconds.
   */
  normalizeVideos(
    raw: Array<{
      id?: string;
      snippet?: { title?: string; description?: string; publishedAt?: string };
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
      contentDetails?: { duration?: string };
    }>,
  ): NormalizedYoutubeVideo[] {
    return raw
      .filter((video) => video.id && video.snippet)
      .map((video) => {
        const stats = video.statistics || {};
        const duration = video.contentDetails?.duration
          ? this.parseIso8601Duration(video.contentDetails.duration)
          : null;

        return {
          youtubeVideoId: video.id!,
          videoTitle: video.snippet?.title || null,
          videoDescription: video.snippet?.description || null,
          durationSeconds: duration,
          viewCount: this.parseStringInt(stats.viewCount),
          likeCount: this.parseStringInt(stats.likeCount),
          commentCount: this.parseStringInt(stats.commentCount),
          publishedAt: video.snippet?.publishedAt
            ? new Date(video.snippet.publishedAt)
            : null,
        };
      });
  }

  /**
   * Normalize YouTube Analytics API rows to daily analytics.
   * Expected row format: [date, views, estimatedMinutesWatched, avgDuration, subscribersGained, subscribersLost]
   */
  normalizeDailyAnalytics(
    rows: Array<[string, ...number[]]> | undefined,
  ): Omit<NormalizedYoutubeDailyAnalytics, 'channelId'>[] {
    if (!rows || !Array.isArray(rows)) {
      this.logger.debug('No analytics rows provided');
      return [];
    }

    return rows.map((row) => {
      const dateStr = row[0];
      const views = row[1];
      const minutesWatched = row[2];
      const avgDuration = row[3];
      const gainedSubs = row[4];
      const lostSubs = row[5];

      return {
        analyticsDate: new Date(dateStr),
        views: typeof views === 'number' ? Math.max(0, views) : 0,
        estimatedMinutesWatched:
          typeof minutesWatched === 'number' ? Math.max(0, minutesWatched) : 0,
        averageViewDurationSeconds:
          typeof avgDuration === 'number' ? Math.max(0, avgDuration) : 0,
        subscribersGained:
          typeof gainedSubs === 'number' ? Math.max(0, gainedSubs) : 0,
        subscribersLost:
          typeof lostSubs === 'number' ? Math.max(0, lostSubs) : 0,
      };
    });
  }

  /**
   * Parse ISO8601 duration string to seconds.
   * Example: "PT5M30S" → 330
   * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
   */
  private parseIso8601Duration(duration: string): number {
    // Match pattern: P[n]Y[n]M[n]DT[n]H[n]M[n]S
    const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
    const match = duration.match(regex);

    if (!match) {
      this.logger.warn(`Failed to parse ISO8601 duration: ${duration}`);
      return 0;
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseFloat(match[3] || '0');

    return hours * 3600 + minutes * 60 + Math.round(seconds);
  }

  /**
   * Safely parse YouTube's string integer (e.g., "123456") to number.
   */
  private parseStringInt(value: string | undefined | null): number {
    if (!value) {
      return 0;
    }

    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  /**
   * Safely parse YouTube's string big integer to JavaScript BigInt.
   * JS integers are safe up to 2^53-1 (~9 * 10^15), but YouTube view counts can exceed this.
   */
  private parseStringBigInt(value: string | undefined | null): bigint {
    if (!value) {
      return 0n;
    }

    try {
      return BigInt(value);
    } catch {
      this.logger.warn(`Failed to parse BigInt value: ${value}`);
      return 0n;
    }
  }

  /**
   * Extract highest resolution thumbnail URL.
   * YouTube API returns thumbnails in order: default, medium, high.
   */
  private getThumbnailUrl(
    thumbnails: Record<string, { url?: string }> | undefined,
  ): string | null {
    if (!thumbnails || typeof thumbnails !== 'object') {
      return null;
    }

    // Prefer high > medium > default
    return (
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      null
    );
  }
}
