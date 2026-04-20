import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE_PROVIDER } from '@database/database.module';
import type { Database } from '@database/database.module';
import {
  contentItems,
  contentMetrics,
  NewContentItem,
  NewContentMetric,
  ContentItem,
} from '@database/drizzle/schema';

@Injectable()
export class ContentRepository {
  constructor(@Inject(DATABASE_PROVIDER) private readonly db: Database) {}

  async upsertContentItems(items: NewContentItem[]): Promise<ContentItem[]> {
    if (items.length === 0) {
      return [];
    }

    return this.db
      .insert(contentItems)
      .values(items)
      .onConflictDoUpdate({
        target: [contentItems.platform, contentItems.externalId],
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          url: sql`excluded.url`,
          thumbnailUrl: sql`excluded.thumbnail_url`,
          publishedAt: sql`excluded.published_at`,
          durationSeconds: sql`excluded.duration_seconds`,
          updatedAt: sql`now()`,
        },
      })
      .returning();
  }

  async insertMetrics(metrics: NewContentMetric[]): Promise<void> {
    if (metrics.length === 0) {
      return;
    }

    await this.db.insert(contentMetrics).values(metrics);
  }
}
