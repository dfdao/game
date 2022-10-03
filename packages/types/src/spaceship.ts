import type { SpaceshipId } from './identifier';
import type { TransactionCollection } from './transaction';
import type { Abstract } from './utility';

/**
 * Abstract type representing an spaceship token info.
 */
export type SpaceshipInfo = Abstract<number, 'SpaceshipInfo'>;

/**
 * Enumeration of spaceship token info.
 */
export const SpaceshipInfo = {
  Unknown: 0 as SpaceshipInfo,
  TokenType: 1 as SpaceshipInfo,
  SpaceshipType: 2 as SpaceshipInfo,
} as const;

/**
 * Abstract type representing an spaceship type.
 */
export type SpaceshipType = Abstract<number, 'SpaceshipType'>;

/**
 * Enumeration of spaceship types.
 */
export const SpaceshipType = {
  Unknown: 0 as SpaceshipType,
  ShipMothership: 1 as SpaceshipType,
  ShipCrescent: 2 as SpaceshipType,
  ShipWhale: 3 as SpaceshipType,
  ShipGear: 4 as SpaceshipType,
  ShipTitan: 5 as SpaceshipType,

  // Don't forget to update MIN_SPACESHIP_TYPE and/or MAX_SPACESHIP_TYPE in the `constants` package
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

/**
 * Represents data associated with a Dark Forest spaceship NFT.
 */
export type Spaceship = {
  id: SpaceshipId;
  spaceshipType: SpaceshipType;

  transactions?: TransactionCollection;
};
