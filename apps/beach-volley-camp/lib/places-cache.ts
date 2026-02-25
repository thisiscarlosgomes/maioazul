export type CachedPlace = {
  id: string;
};

let cachedPlaces: CachedPlace[] | null = null;

export function getCachedPlaces<T extends CachedPlace = CachedPlace>() {
  return cachedPlaces as T[] | null;
}

export function setCachedPlaces<T extends CachedPlace = CachedPlace>(places: T[]) {
  cachedPlaces = places;
}
