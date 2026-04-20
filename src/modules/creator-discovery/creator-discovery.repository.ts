import { Injectable, Inject } from '@nestjs/common';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { DATABASE_PROVIDER } from '@database/database.module';
import type { Database } from '@database/database.module';
import { contentItems, userProfiles, users } from '@database/drizzle/schema';

@Injectable()
export class CreatorDiscoveryRepository {
  constructor(@Inject(DATABASE_PROVIDER) private readonly db: Database) {}

  async searchCreators(params: {
    query?: string;
    platform?: 'youtube' | 'tiktok' | 'instagram' | 'other';
    minInfluenceScore?: number;
    maxInfluenceScore?: number;
    limit: number;
    offset: number;
  }) {
    const filters = [eq(users.role, 'creator')];

    if (params.query) {
      const like = `%${params.query}%`;
      filters.push(
        or(
          ilike(userProfiles.displayName, like),
          ilike(userProfiles.bio, like),
        )!,
      );
    }

    if (params.minInfluenceScore !== undefined) {
      filters.push(
        sql`${userProfiles.influenceScore} >= ${params.minInfluenceScore}`,
      );
    }

    if (params.maxInfluenceScore !== undefined) {
      filters.push(
        sql`${userProfiles.influenceScore} <= ${params.maxInfluenceScore}`,
      );
    }

    const query = this.db
      .select({
        userId: users.id,
        displayName: userProfiles.displayName,
        bio: userProfiles.bio,
        influenceScore: userProfiles.influenceScore,
        audienceSize: userProfiles.audienceSize,
      })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id));

    if (params.platform) {
      query.innerJoin(
        contentItems,
        and(
          eq(contentItems.userId, users.id),
          eq(contentItems.platform, params.platform),
        ),
      );
    }

    return query
      .where(and(...filters))
      .limit(params.limit)
      .offset(params.offset);
  }

  async getCreatorsByIds(ids: number[]) {
    return this.db
      .select({
        userId: users.id,
        displayName: userProfiles.displayName,
        influenceScore: userProfiles.influenceScore,
        audienceSize: userProfiles.audienceSize,
      })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(and(eq(users.role, 'creator'), inArray(users.id, ids)));
  }
}
