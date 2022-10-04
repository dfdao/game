import { Abstract } from './utility';

/**
 * Abstract type representing an artifact type.
 */
export type SpaceshipType = Abstract<number, 'SpaceshipType'>;

/**
 * Enumeration of artifact types.
 */
export const SpaceshipType = {
  Unknown: 0 as SpaceshipType,
  ShipMothership: 1 as SpaceshipType,
  ShipCrescent: 2 as SpaceshipType,
  ShipWhale: 3 as SpaceshipType,
  ShipGear: 4 as SpaceshipType,
  ShipTitan: 5 as SpaceshipType,

  // Don't forget to update MIN_ARTIFACT_TYPE and/or MAX_ARTIFACT_TYPE in the `constants` package
} as const;

/**
 * Mapping from SpaceshipType to pretty-printed names.
 */
export const SpaceshipTypeNames = {
  [SpaceshipType.Unknown]: 'Unknown',
  [SpaceshipType.ShipMothership]: 'Mothership',
  [SpaceshipType.ShipCrescent]: 'Crescent',
  [SpaceshipType.ShipWhale]: 'Whale',
  [SpaceshipType.ShipGear]: 'Gear',
  [SpaceshipType.ShipTitan]: 'Titan',
} as const;
