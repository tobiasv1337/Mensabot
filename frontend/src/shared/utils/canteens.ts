type CoordinatesLike = {
  lat?: number | null;
  lng?: number | null;
};

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const hasFiniteCoordinates = <T extends CoordinatesLike>(value: T): value is T & { lat: number; lng: number } =>
  isFiniteNumber(value.lat) && isFiniteNumber(value.lng);

export const formatDistanceKm = (distanceKm: number | null | undefined, digits = 1): string | null =>
  isFiniteNumber(distanceKm) ? `${distanceKm.toFixed(digits)} km` : null;
