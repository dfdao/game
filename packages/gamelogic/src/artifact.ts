import { hashToInt } from '@dfdao/serde';
import {
  Abstract,
  Artifact,
  ArtifactId,
  ArtifactRarity,
  ArtifactRarityNames,
  ArtifactType,
  ArtifactTypeNames,
  Biome,
  BiomeNames,
  PlanetLevel,
  RenderedArtifact,
} from '@dfdao/types';

export const RelicsList: ArtifactType[] = [
  ArtifactType.Wormhole,
  ArtifactType.PlanetaryShield,
  ArtifactType.PhotoidCannon,
  ArtifactType.BloomFilter,
  ArtifactType.BlackDomain,
];

// relics are the forgotten technologies / the artifacts that you can talk to
export function isRelic(type: ArtifactType): boolean {
  return ArtifactType.Wormhole <= type && type <= ArtifactType.BlackDomain;
}

export function isBasic(type: ArtifactType): boolean {
  return ArtifactType.Monolith <= type && type <= ArtifactType.Pyramid;
}

export function hasStatBoost(type: ArtifactType | undefined): boolean {
  return (
    type !== ArtifactType.BlackDomain &&
    type !== ArtifactType.BloomFilter &&
    type !== ArtifactType.Wormhole
  );
}

const artifactIsAncientMap: Map<ArtifactId, boolean> = new Map();

export function getArtifactDebugName(a?: Artifact): string {
  if (!a) {
    return 'unknown artifact';
  }

  return a.id.substring(0, 8);
}

export const biomeName = (biome: Biome): string => BiomeNames[biome];

export const rarityName = (rarity: ArtifactRarity): string => ArtifactRarityNames[rarity];

export const rarityNameFromArtifact = (a: Artifact): string => rarityName(a.rarity);

export function artifactBiomeName(artifact: Artifact): string {
  if (isAncient(artifact)) return 'Ancient';
  return biomeName(artifact.planetBiome);
}

export const levelFromRarity = (rarity: ArtifactRarity): PlanetLevel => {
  if (rarity === ArtifactRarity.Mythic) return PlanetLevel.NINE;
  else if (rarity === ArtifactRarity.Legendary) return PlanetLevel.SEVEN;
  else if (rarity === ArtifactRarity.Epic) return PlanetLevel.FIVE;
  else if (rarity === ArtifactRarity.Rare) return PlanetLevel.THREE;
  else return PlanetLevel.ONE;
};

const artifactFileNamesById: Map<ArtifactId, string> = new Map();

export type ArtifactFileColor = Abstract<number, 'ArtifactFileColor'>;
export const ArtifactFileColor = {
  BLUE: 0 as ArtifactFileColor,
  APP_BACKGROUND: 1 as ArtifactFileColor,
};

let forceAncient: boolean | undefined = undefined;

export function artifactRoll(id: ArtifactId): number {
  return hashToInt(id) % 256;
}

export function isAncient(artifact: RenderedArtifact): boolean {
  if (forceAncient !== undefined) return forceAncient;

  const { id, planetBiome: biome } = artifact;

  if (artifactIsAncientMap.has(id)) {
    return artifactIsAncientMap.get(id) || false;
  }

  let ancient = false;
  const roll = artifactRoll(id);

  if (biome === Biome.CORRUPTED) ancient = roll % 2 === 0;
  else ancient = roll % 16 === 0;

  artifactIsAncientMap.set(id, ancient);

  return ancient;
}

export function setForceAncient(force: boolean): void {
  forceAncient = force;
}

export function artifactFileName(
  videoMode: boolean,
  thumb: boolean,
  artifact: RenderedArtifact,
  color: ArtifactFileColor,
  // used in GifRenderer.ts to generate filenames from mock artifacts
  debugProps: { forceAncient: boolean; skipCaching: boolean } | undefined = undefined
): string {
  const { artifactType: type, rarity, planetBiome: biome, id } = artifact;

  const size = thumb ? '16' : '64';
  const ext = videoMode ? 'webm' : 'png';

  let fileName = '';

  if (!debugProps?.skipCaching && artifactFileNamesById.has(id)) {
    fileName = artifactFileNamesById.get(id) || '';
  } else {
    const typeStr = ArtifactTypeNames[type];
    const rarityStr = ArtifactRarityNames[rarity];
    let nameStr = '';
    if (debugProps) {
      if (debugProps.forceAncient) {
        nameStr = 'ancient';
      } else {
        nameStr = biome + BiomeNames[biome];
      }
    } else {
      if (isAncient(artifact)) {
        nameStr = 'ancient';
      } else {
        nameStr = biome + BiomeNames[biome];
      }
    }
    fileName = `${typeStr}-${rarityStr}-${nameStr}`;
  }

  if (!debugProps?.skipCaching) artifactFileNamesById.set(id, fileName);

  let colorStr = '';
  if (color === ArtifactFileColor.APP_BACKGROUND) colorStr = '-bg';

  return `${size}-${fileName}${colorStr}.${ext}`;
}

export function getActiveBlackDomain(artifacts: Artifact[]): Artifact | undefined {
  for (const artifact of artifacts) {
    if (artifact.artifactType === ArtifactType.BlackDomain) return artifact;
  }
  return undefined;
}
