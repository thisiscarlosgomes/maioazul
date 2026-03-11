export type CachedExperienceImage = {
  id: string;
};

export type CachedExperienceGroup = {
  slug: string;
};

let cachedExperienceImages: CachedExperienceImage[] | null = null;
const cachedExperienceGroupsBySlug = new Map<string, CachedExperienceGroup>();

export function getCachedExperienceImages<
  T extends CachedExperienceImage = CachedExperienceImage,
>() {
  return cachedExperienceImages as T[] | null;
}

export function setCachedExperienceImages<
  T extends CachedExperienceImage = CachedExperienceImage,
>(items: T[]) {
  cachedExperienceImages = items;
}

export function getCachedExperienceGroup<
  T extends CachedExperienceGroup = CachedExperienceGroup,
>(slug: string) {
  return (cachedExperienceGroupsBySlug.get(slug) as T | undefined) ?? null;
}

export function setCachedExperienceGroup<
  T extends CachedExperienceGroup = CachedExperienceGroup,
>(slug: string, group: T) {
  cachedExperienceGroupsBySlug.set(slug, group);
}

