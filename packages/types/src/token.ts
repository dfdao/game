import { Abstract } from './utility';

export type CollectionType = Abstract<number, 'CollectionType'>;

export const CollectionType = {
  Unknown: 0 as CollectionType,
  Artifact: 1 as CollectionType,
  Spaceship: 2 as CollectionType,
} as const;

/**
 * Mapping from CollectionType to pretty-printed names.
 */
export const CollectionTypeNames = {
  [CollectionType.Unknown]: 'Unknown',
  [CollectionType.Artifact]: 'Artifact',
  [CollectionType.Spaceship]: 'Spaceship',
} as const;
