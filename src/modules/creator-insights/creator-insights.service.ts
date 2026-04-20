import { Injectable } from '@nestjs/common';
import type { RequestUser } from '@/types';
import { CreatorInsightsRepository } from './creator-insights.repository';
import { CreatorInsightsCacheService } from './creator-insights-cache.service';

@Injectable()
export class CreatorInsightsService {
  constructor(
    private readonly repository: CreatorInsightsRepository,
    private readonly cache: CreatorInsightsCacheService,
  ) {}

  async getAudienceInsights(actor: RequestUser, days: number) {
    const cached = await this.cache.getAudience(actor.id, days);
    if (cached) {
      return cached;
    }

    const profile = await this.repository.getUserProfile(actor.id);
    const channel = await this.repository.getLatestChannelForUser(actor.id);

    if (!channel) {
      const emptyResponse = {
        channel: null,
        audience: {
          views: 0,
          estimatedMinutesWatched: 0,
          averageViewDurationSeconds: 0,
          subscribersGained: 0,
          subscribersLost: 0,
        },
        influenceScore: profile?.influenceScore ?? null,
        windowDays: days,
        syncedAt: null,
      };

      await this.cache.setAudience(actor.id, days, emptyResponse);
      return emptyResponse;
    }

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));

    const analytics = await this.repository.getAnalyticsSince(
      channel.id,
      since,
    );

    const aggregate = analytics.reduce(
      (acc, row) => {
        acc.views += row.views ?? 0;
        acc.estimatedMinutesWatched += row.estimatedMinutesWatched ?? 0;
        acc.averageViewDurationSeconds += row.averageViewDurationSeconds ?? 0;
        acc.subscribersGained += row.subscribersGained ?? 0;
        acc.subscribersLost += row.subscribersLost ?? 0;
        return acc;
      },
      {
        views: 0,
        estimatedMinutesWatched: 0,
        averageViewDurationSeconds: 0,
        subscribersGained: 0,
        subscribersLost: 0,
      },
    );

    if (analytics.length > 0) {
      aggregate.averageViewDurationSeconds = Math.round(
        aggregate.averageViewDurationSeconds / analytics.length,
      );
    }

    const response = {
      channel: {
        youtubeChannelId: channel.youtubeChannelId,
        channelTitle: channel.channelTitle ?? null,
        subscriberCount: channel.subscriberCount ?? 0,
        totalViewCount: Number(channel.totalViewCount ?? 0),
        videoCount: channel.videoCount ?? 0,
      },
      audience: aggregate,
      influenceScore: profile?.influenceScore ?? null,
      windowDays: days,
      syncedAt: channel.lastSyncedAt
        ? channel.lastSyncedAt.toISOString()
        : null,
    };

    await this.cache.setAudience(actor.id, days, response);
    return response;
  }

  async getContentInsights(actor: RequestUser, limit: number) {
    const cached = await this.cache.getContent(actor.id, limit);
    if (cached) {
      return cached;
    }

    const channel = await this.repository.getLatestChannelForUser(actor.id);
    if (!channel) {
      const emptyResponse = {
        youtubeChannelId: null,
        items: [],
        limit,
      };
      await this.cache.setContent(actor.id, limit, emptyResponse);
      return emptyResponse;
    }

    const rows = await this.repository.getRecentVideosWithScores(
      channel.id,
      limit,
    );

    const items = rows.map((row) => ({
      youtubeVideoId: row.video.youtubeVideoId,
      title: row.video.videoTitle ?? null,
      viewCount: row.video.viewCount ?? 0,
      likeCount: row.video.likeCount ?? 0,
      commentCount: row.video.commentCount ?? 0,
      publishedAt: row.video.publishedAt
        ? row.video.publishedAt.toISOString()
        : null,
      score: {
        engagementScore: row.score?.engagementScore ?? null,
        growthScore: row.score?.growthScore ?? null,
        recommendationScore: row.score?.recommendationScore ?? null,
        performanceRank: row.score?.performanceRank ?? null,
      },
    }));

    const response = {
      youtubeChannelId: channel.youtubeChannelId,
      items,
      limit,
    };

    await this.cache.setContent(actor.id, limit, response);
    return response;
  }
}
