export const ERAS = ["Emergence", "Patterning", "Coherence", "Complexification", "Destabilization", "Transition"] as const;
export const SEASONS_PER_ERA = 4;
export function eraIndex(season: number): number {
  return Math.min(ERAS.length - 1, Math.floor(season / SEASONS_PER_ERA));
}
