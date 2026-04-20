import { Injectable } from '@nestjs/common';
import { CreatorDiscoveryRepository } from './creator-discovery.repository';
import { CreatorDiscoveryCacheService } from './creator-discovery-cache.service';

@Injectable()
export class CreatorDiscoveryService {
  constructor(
    private readonly repository: CreatorDiscoveryRepository,
    private readonly cache: CreatorDiscoveryCacheService,
  ) {}

  async discoverCreators(params: {
    query?: string;
    platform?: 'youtube' | 'tiktok' | 'instagram' | 'other';
    minInfluenceScore?: number;
    maxInfluenceScore?: number;
    limit: number;
    offset: number;
  }) {
    const cacheKey = JSON.stringify({
      q: params.query || '',
      p: params.platform || '',
      min: params.minInfluenceScore ?? null,
      max: params.maxInfluenceScore ?? null,
      limit: params.limit,
      offset: params.offset,
    });

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const creators = await this.repository.searchCreators(params);
    const response = {
      creators,
      limit: params.limit,
      offset: params.offset,
    };

    await this.cache.set(cacheKey, response);
    return response;
  }

  async compareCreators(params: {
    creatorIds?: number[];
    query?: string;
    limit: number;
  }) {
    const mode = params.creatorIds?.length ? 'ids' : 'search';
    const cacheKey = JSON.stringify({
      mode,
      ids: params.creatorIds || [],
      q: params.query || '',
      limit: params.limit,
    });

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let creators: Array<{
      userId: number;
      displayName: string | null;
      influenceScore: number | null;
      audienceSize: number;
    }>;

    if (params.creatorIds?.length) {
      creators = (
        await this.repository.getCreatorsByIds(params.creatorIds)
      ).map((creator) => ({
        ...creator,
        audienceSize: creator.audienceSize ?? 0,
      }));
    } else {
      creators = (
        await this.repository.searchCreators({
          query: params.query,
          platform: undefined,
          minInfluenceScore: undefined,
          maxInfluenceScore: undefined,
          limit: params.limit,
          offset: 0,
        })
      ).map((creator) => ({
        ...creator,
        audienceSize: creator.audienceSize ?? 0,
      }));
    }

    const response = {
      creators,
      mode,
    };

    await this.cache.set(cacheKey, response);
    return response;
  }
}
