import { EMPTY_ADDRESS, EMPTY_LOCATION_ID } from '@dfdao/constants';
import {
  Artifact,
  ArtifactId,
  ArtifactRarity,
  ArtifactType,
  Biome,
  Spaceship,
  SpaceshipId,
} from '@dfdao/types';


const godGrammar = {
  god1: [
    "c'",
    'za',
    "ry'",
    "ab'",
    "bak'",
    "dt'",
    "ek'",
    "fah'",
    "q'",
    'qo',
    'van',
    'bow',
    'gui',
    'si',
  ],
  god2: [
    'thun',
    'tchalla',
    'thovo',
    'saron',
    'zoth',
    'sharrj',
    'thulu',
    'ra',
    'wer',
    'doin',
    'renstad',
    'nevere',
    'goth',
    'anton',
    'layton',
  ],
};

/**
 * Deterministically generates the name of the artifact from its ID.
 *
 * @param artifact The artifact to generate a name for
 */
export function nameOfArtifact(artifact: Artifact) {
  const idNum = parseInt(artifact.id, 16);

  const roll1 = (idNum % 7919) % godGrammar.god1.length; // 7919 is a big prime
  const roll2 = (idNum % 7883) % godGrammar.god2.length; // 7883 is a big prime

  const name = godGrammar.god1[roll1] + godGrammar.god2[roll2];
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1);

  return nameCapitalized;
}
/**
 * Deterministically generates the name of the spaceship from its ID.
 *
 * @param spaceship The spaceship to generate a name for
 */
export function nameOfSpaceship(spaceship: Spaceship) {
  const idNum = parseInt(spaceship.id, 16);

  const roll1 = (idNum % 7919) % godGrammar.god1.length; // 7919 is a big prime
  const roll2 = (idNum % 7883) % godGrammar.god2.length; // 7883 is a big prime

  const name = godGrammar.god1[roll1] + godGrammar.god2[roll2];
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1);

  return nameCapitalized;
}

const artifactNamesById = new Map<ArtifactId, string>();
export const artifactName = (artifact: Artifact | undefined): string => {
  if (!artifact) return 'Unknown';

  const myName = artifactNamesById.get(artifact.id);
  if (myName) return myName;

  const name = nameOfArtifact(artifact);
  artifactNamesById.set(artifact.id, name);

  return name;
};

const spaceshipNamesById = new Map<SpaceshipId, string>();
export const spaceshipName = (spaceship: Spaceship | undefined): string => {
  if (!spaceship) return 'Unknown';

  const myName = spaceshipNamesById.get(spaceship.id);
  if (myName) return myName;

  const name = nameOfSpaceship(spaceship);
  spaceshipNamesById.set(spaceship.id, name);

  return name;
};

const randomHex = (len: number): string => {
  let str = '';
  const chars = 'abcdef0123456789'.split('');
  while (str.length < len) {
    str = str + chars[Math.floor(Math.random() * chars.length)];
  }

  return str;
};

export const mockArtifact = (
  rarity: ArtifactRarity,
  artifactType: ArtifactType = ArtifactType.Spaceship,
  planetBiome: Biome = Biome.WASTELAND
): Artifact =>
  ({
    id: randomHex(64) as ArtifactId,
    planetDiscoveredOn: EMPTY_LOCATION_ID,
    planetBiome,
    mintedAtTimestamp: Date.now(),
    discoverer: EMPTY_ADDRESS,
    currentOwner: EMPTY_ADDRESS,
    isInititalized: true,
    lastActivated: 0,
    lastDeactivated: 0,
    rarity: rarity,
    artifactType,
    upgrade: {
      energyCapMultiplier: 120,
      energyGroMultiplier: 100,
      rangeMultiplier: 100,
      speedMultiplier: 85,
      defMultiplier: 100,
    },
    onPlanetId: undefined,
  } as Artifact);

export const mockArtifactWithRarity = (
  rarity: ArtifactRarity,
  artifactType: ArtifactType = ArtifactType.Spaceship,
  planetBiome: Biome = Biome.WASTELAND
): Artifact => mockArtifact(rarity, artifactType, planetBiome);

export const mockCommon = mockArtifactWithRarity(
  ArtifactRarity.Common,
  ArtifactType.Spaceship,
  Biome.WASTELAND
);

export const mockRare = mockArtifactWithRarity(
  ArtifactRarity.Rare,
  ArtifactType.Spaceship,
  Biome.WASTELAND
);

export const mockEpic = mockArtifactWithRarity(
  ArtifactRarity.Epic,
  ArtifactType.Spaceship,
  Biome.WASTELAND
);

export const mockLegendary = mockArtifactWithRarity(
  ArtifactRarity.Legendary,
  ArtifactType.Spaceship,
  Biome.WASTELAND
);
