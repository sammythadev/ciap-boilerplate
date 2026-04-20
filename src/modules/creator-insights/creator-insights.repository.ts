import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';
import { DATABASE_PROVIDER } from '@database/database.module';
import type { Database } from '@database/database.module';
import {
  userProfiles,
  youtubeChannels,
  youtubeDailyAnalytics,
  youtubeVideos,
  youtubeMlScores,
} from '@database/drizzle/schema';

@Injectable()
export class CreatorInsightsRepository {
  constructor(@Inject(DATABASE_PROVIDER) private readonly db: Database) {}

  async getUserProfile(userId: number) {
    const result = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return result[0] || null;
  }

  async getLatestChannelForUser(userId: number) {
    const result = await this.db
      .select()
      .from(youtubeChannels)
      .where(eq(youtubeChannels.userId, userId))
      .orderBy(desc(youtubeChannels.createdAt))
      .limit(1);

    return result[0] || null;
  }

  async getAnalyticsSince(channelId: number, since: Date) {
    return this.db
      .select()
      .from(youtubeDailyAnalytics)
      .where(
        and(
          eq(youtubeDailyAnalytics.channelId, channelId),
          gte(youtubeDailyAnalytics.analyticsDate, since),
        ),
      )
      .orderBy(desc(youtubeDailyAnalytics.analyticsDate));
  }

  async getRecentVideosWithScores(channelId: number, limit: number) {
    return this.db
      .select({
        video: youtubeVideos,
        score: youtubeMlScores,
      })
      .from(youtubeVideos)
      .leftJoin(youtubeMlScores, eq(youtubeMlScores.videoId, youtubeVideos.id))
      .where(eq(youtubeVideos.channelId, channelId))
      .orderBy(desc(youtubeVideos.publishedAt))
      .limit(limit);
  }
}
