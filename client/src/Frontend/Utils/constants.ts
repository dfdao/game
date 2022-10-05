import { ArtifactRarity, ArtifactType } from '@dfdao/types';
import * as bigInt from 'big-integer';

// To developer, increase this number to 256. This, in combination with setting `DISABLE_ZK_CHECKS`
// in darkforest.toml, will make you mine the map at ULTRA SPEED!
// To code reviewer, make sure this does not change in a PR to develop!
const MIN_CHUNK_SIZE = 16;

/**
 * @tutorial to speed up the game's background rendering code, it is possible to set this value to
 * be a higher power of two. This means that smaller chunks will be merged into larger chunks via
 * the algorithms implemented in {@link ChunkUtils}.
 *
 * {@code Math.floor(Math.pow(2, 16))} should be large enough for most.
 */
const MAX_CHUNK_SIZE = 2 ** 14;

const LOCATION_ID_UB = bigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

export { MIN_CHUNK_SIZE, MAX_CHUNK_SIZE, LOCATION_ID_UB };

export const enum DFZIndex {
  MenuBar = 4,
  HoverPlanet = 1001,
  Modal = 1001,
  Tooltip = 16000000,
  Notification = 1000,
}

export const artifactTypePrices: Map<ArtifactType, number> = new Map([
  [ArtifactType.BlackDomain, 1e5],
  [ArtifactType.BloomFilter, 1e5],
  [ArtifactType.Colossus, 1e5],
  [ArtifactType.Monolith, 1e5],
  [ArtifactType.PhotoidCannon, 1e5],
  [ArtifactType.PlanetaryShield, 1e5],
  [ArtifactType.Pyramid, 1e5],
  [ArtifactType.Wormhole, 1e5],
  [ArtifactType.Unknown, 1e5],
]);

export const artifactRarityPrices: Map<ArtifactRarity, number> = new Map([
  [ArtifactRarity.Common, 1],
  [ArtifactRarity.Rare, 1.2],
  [ArtifactRarity.Epic, 1.5],
  [ArtifactRarity.Legendary, 2],
  [ArtifactRarity.Mythic, 5],
  [ArtifactRarity.Unknown, 1],
]);

export interface ShopArtifact {
  artifactType: ArtifactType;
  rarity: ArtifactRarity;
}

export const possibleShopArtifacts: ShopArtifact[] = Object.values(ArtifactType)
  .map((type) =>
    Object.values(ArtifactRarity).map((rarity) => {
      return {
        artifactType: type,
        rarity,
      };
    })
  )
  .flat();
