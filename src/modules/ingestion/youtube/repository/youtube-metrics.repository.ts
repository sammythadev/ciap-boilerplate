import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE_PROVIDER } from '@database/database.module';
import type { Database } from '@database/database.module';
import { youtubeMlScores, NewYoutubeMlScore } from '@database/drizzle/schema';

/**
 * YouTube Metrics Repository
 * Handles persistence of ML scoring results and metric computations.
 */
@Injectable()
export class YoutubeMetricsRepository {
  constructor(@Inject(DATABASE_PROVIDER) private readonly db: Database) {}

  /**
   * Upsert ML scores for videos.
   * Overwrites previous scores for the same video using SQL EXCLUDED.
   * Requires unique index on videoId (one active score per video).
   */
  async upsertMlScores(
    scores: Array<Omit<NewYoutubeMlScore, 'createdAt' | 'updatedAt'>>,
  ): Promise<(typeof youtubeMlScores.$inferSelect)[]> {
    return this.db
      .insert(youtubeMlScores)
      .values(scores as NewYoutubeMlScore[])
      .onConflictDoUpdate({
        target: youtubeMlScores.videoId,
        set: {
          engagementScore: sql`excluded.engagement_score`,
          growthScore: sql`excluded.growth_score`,
          recommendationScore: sql`excluded.recommendation_score`,
          performanceRank: sql`excluded.performance_rank`,
          jobId: sql`excluded.job_id`,
          scoredAt: sql`excluded.scored_at`,
          updatedAt: sql`now()`,
        },
      })
      .returning()
      .execute()
      .catch((error: Error) => {
        throw new Error(
          `Failed to upsert ML scores: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  /**
   * Get top-scored videos for a channel.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getTopScoredVideos(): Promise<NewYoutubeMlScore[]> {
    // Would typically join with youtubeVideos table and order by recommendationScore
    // Placeholder implementation; expand as needed
    return [];
  }

  /**
   * Get recent ML scores for user's videos.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getRecentScores(): Promise<NewYoutubeMlScore[]> {
    // Would fetch scores for all user's videos, ordered by scored date
    // Placeholder implementation; expand as needed
    return [];
  }
}
