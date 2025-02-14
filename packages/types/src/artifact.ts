import type { Biome } from './game_types';
import type { ArtifactId } from './identifier';
import type { TransactionCollection } from './transaction';
import type { Abstract } from './utility';

/**
 * Abstract type representing an artifact info.
 */
export type ArtifactInfo = Abstract<number, 'ArtifactInfo'>;

/**
 * Enumeration of artifact info.
 */
export const ArtifactInfo = {
  Unknown: 0 as ArtifactInfo,
  TokenType: 1 as ArtifactInfo,
  ArtifactRarity: 2 as ArtifactInfo,
  ArtifactType: 3 as ArtifactInfo,
  Biome: 4 as ArtifactInfo,
} as const;

/**
 * Abstract type representing an artifact type.
 */
export type ArtifactType = Abstract<number, 'ArtifactType'>;

/**
 * Enumeration of artifact types.
 */
export const ArtifactType = {
  Unknown: 0 as ArtifactType,
  Monolith: 1 as ArtifactType,
  Colossus: 2 as ArtifactType,
  Spaceship: 3 as ArtifactType,
  Pyramid: 4 as ArtifactType,
  Wormhole: 5 as ArtifactType,
  PlanetaryShield: 6 as ArtifactType,
  PhotoidCannon: 7 as ArtifactType,
  BloomFilter: 8 as ArtifactType,
  BlackDomain: 9 as ArtifactType,

  // Don't forget to update MIN_ARTIFACT_TYPE and/or MAX_ARTIFACT_TYPE in the `constants` package
} as const;

/**
 * Mapping from ArtifactType to pretty-printed names.
 */
export const ArtifactTypeNames = {
  [ArtifactType.Unknown]: 'Unknown',
  [ArtifactType.Monolith]: 'Monolith',
  [ArtifactType.Colossus]: 'Colossus',
  [ArtifactType.Spaceship]: 'Spaceship',
  [ArtifactType.Pyramid]: 'Pyramid',
  [ArtifactType.Wormhole]: 'Wormhole',
  [ArtifactType.PlanetaryShield]: 'Planetary Shield',
  [ArtifactType.BlackDomain]: 'Black Domain',
  [ArtifactType.PhotoidCannon]: 'Photoid Cannon',
  [ArtifactType.BloomFilter]: 'Bloom Filter',
} as const;

/**
 * Abstract type representing an artifact rarity level.
 */
export type ArtifactRarity = Abstract<number, 'ArtifactRarity'>;

/**
 * Enumeration of artifact rarity levels. Common = 1, Mythic = 5
 */
export const ArtifactRarity = {
  Unknown: 0 as ArtifactRarity,
  Common: 1 as ArtifactRarity,
  Rare: 2 as ArtifactRarity,
  Epic: 3 as ArtifactRarity,
  Legendary: 4 as ArtifactRarity,
  Mythic: 5 as ArtifactRarity,
  // Don't forget to update MIN_ARTIFACT_RARITY and/or MAX_ARTIFACT_RARITY in the `constants` package
} as const;

/**
 * Mapping from ArtifactRarity to pretty-printed names.
 */
export const ArtifactRarityNames = {
  [ArtifactRarity.Unknown]: 'Unknown',
  [ArtifactRarity.Common]: 'Common',
  [ArtifactRarity.Rare]: 'Rare',
  [ArtifactRarity.Epic]: 'Epic',
  [ArtifactRarity.Legendary]: 'Legendary',
  [ArtifactRarity.Mythic]: 'Mythic',
} as const;

/**
 * mapping from ArtifactRarity to points earned for finding this artifact.
 */
export type ArtifactPointValues = { [ArtifactRarity: number]: number };

/**
 * Represents data associated with a Dark Forest artifact NFT. Note
 * that some `Artifact` fields store client-specific data that the blockchain is
 * not aware of, such as `unconfirmedDepositArtifact` (tracks pending
 * depositArtifact transaction that involves this artifact). If you're using a
 * client that can't send transactions, these fields should be ignored.
 */
export type Artifact = {
  id: ArtifactId;
  rarity: ArtifactRarity;
  planetBiome: Biome;
  artifactType: ArtifactType;

  transactions?: TransactionCollection;
};

/**
 * type interface for ERC721 metadata.
 */

type NFTAttribute = {
  trait_type: string;
  value: string | number;
  display_type?: string;
};
export type NFTMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
};

export interface RenderedArtifact extends Partial<Artifact> {
  artifactType: ArtifactType;
  planetBiome: Biome;
  rarity: ArtifactRarity;
  id: ArtifactId; // for rolls
}
