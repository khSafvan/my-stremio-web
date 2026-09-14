import { AnimeMetadata } from './types';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const ANILIST_QUERY = `
query ($search: String, $idMal: Int) {
  Media (search: $search, idMal: $idMal, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    episodes
    status
    nextAiringEpisode {
      airingAt
      episode
    }
    averageScore
    trailer {
      id
      site
    }
    coverImage {
      extraLarge
    }
    bannerImage
  }
}
`;

/**
 * Fetches rich anime metadata from AniList GraphQL (zero API key required).
 */
export async function fetchAniListMetadata(options: {
    search?: string;
    idMal?: number;
}): Promise<AnimeMetadata | null> {
    const { search, idMal } = options;
    if (!search && !idMal) return null;

    try {
        const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: ANILIST_QUERY,
                variables: {
                    ...(search ? { search } : {}),
                    ...(idMal ? { idMal } : {}),
                },
            }),
        });

        if (!response.ok) return null;
        const result = await response.json();
        const media = result?.data?.Media;
        if (!media) return null;

        return {
            romajiTitle: media.title?.romaji,
            englishTitle: media.title?.english,
            nativeTitle: media.title?.native,
            episodesCount: media.episodes,
            status: media.status,
            averageScore: media.averageScore,
            bannerUrl: media.bannerImage || media.coverImage?.extraLarge,
            trailerKey: media.trailer?.site === 'youtube' ? media.trailer?.id : undefined,
            nextAiringEpisode: media.nextAiringEpisode
                ? {
                      episode: media.nextAiringEpisode.episode,
                      airingAt: media.nextAiringEpisode.airingAt,
                  }
                : undefined,
        };
    } catch (e) {
        console.warn('Failed to fetch AniList metadata:', e);
        return null;
    }
}
