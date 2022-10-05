import type { DarkForest } from '@dfdao/contracts/typechain';
import {
  Artifact,
  ArtifactId,
  ArtifactInfo,
  ArtifactPointValues,
  ArtifactRarity,
  ArtifactType,
  Biome,
  TokenType,
} from '@dfdao/types';
import bigInt from 'big-integer';
import { BigNumber as EthersBN, utils } from 'ethers';

/**
 * Converts a possibly 0x-prefixed string of hex digits to an `ArtifactId`: a
 * non-0x-prefixed all lowercase hex string of exactly 64 hex characters
 * (0-padded if necessary). ArtifactIDs should only be instantiated through
 * `artifactIdFromHexStr`, `artifactIdFromDecStr`, and `artifactIdFromEthersBN`.
 *
 * @param artifactId Possibly 0x-prefixed, possibly unpadded hex `string`
 * representation of an artifact's ID.
 */
export function artifactIdFromHexStr(artifactId: string): ArtifactId {
  const artifactIdBI = bigInt(artifactId, 16);
  let ret = artifactIdBI.toString(16);
  if (ret.length > 64) throw new Error('not a valid artifact id');
  while (ret.length < 64) ret = '0' + ret;
  return ret as ArtifactId;
}

/**
 * Converts a string representing a decimal number into an ArtifactID: a
 * non-0x-prefixed all lowercase hex string of exactly 64 hex characters
 * (0-padded if necessary). ArtifactIDs should only be instantiated through
 * `artifactIdFromHexStr`, `artifactIdFromDecStr`, and `artifactIdFromEthersBN`.
 *
 * @param artifactId `string` of decimal digits, the base 10 representation of an
 * artifact ID.
 */
export function artifactIdFromDecStr(artifactId: string): ArtifactId {
  const locationBI = bigInt(artifactId);
  let ret = locationBI.toString(16);
  while (ret.length < 64) ret = '0' + ret;
  return ret as ArtifactId;
}

/**
 * Converts a ethers.js BigNumber (type aliased here as EthersBN) representing a
 * decimal number into an ArtifactID: a non-0x-prefixed all lowercase hex string
 * of exactly 64 hex characters (0-padded if necessary). ArtifactIDs should only
 * be instantiated through `artifactIdFromHexStr`, `artifactIdFromDecStr`, and
 * `artifactIdFromEthersBN`.
 *
 * @param artifactId ether.js `BigNumber` representing artifact's ID
 */
export function artifactIdFromEthersBN(artifactId: EthersBN): ArtifactId {
  return artifactIdFromDecStr(artifactId.toString());
}

/**
 * Converts an ArtifactID to a decimal string with equivalent numerical value;
 * can be used if you need to pass an artifact ID into a web3 call.
 *
 * @param artifactId non-0x-prefixed lowercase hex `string` of 64 hex characters
 * representing an artifact's ID
 */
export function artifactIdToDecStr(artifactId: ArtifactId): string {
  return bigInt(artifactId, 16).toString(10);
}

export function artifactIdToEthersBN(artifactId: ArtifactId): EthersBN {
  return EthersBN.from(artifactIdToDecStr(artifactId));
}

export type RawArtifactPointValues = Awaited<ReturnType<DarkForest['getArtifactPointValues']>>;

/**
 * Converts the raw typechain result of a call to
 * `DarkForest.getArtifactPointValues` to an `ArtifactPointValues`
 * typescript typed object (see @dfdao/types).
 */
export function decodeArtifactPointValues(
  rawPointValues: RawArtifactPointValues
): ArtifactPointValues {
  return {
    [ArtifactRarity.Unknown]: rawPointValues[ArtifactRarity.Unknown].toNumber(),
    [ArtifactRarity.Common]: rawPointValues[ArtifactRarity.Common].toNumber(),
    [ArtifactRarity.Rare]: rawPointValues[ArtifactRarity.Rare].toNumber(),
    [ArtifactRarity.Epic]: rawPointValues[ArtifactRarity.Epic].toNumber(),
    [ArtifactRarity.Legendary]: rawPointValues[ArtifactRarity.Legendary].toNumber(),
    [ArtifactRarity.Mythic]: rawPointValues[ArtifactRarity.Mythic].toNumber(),
  };
}

function calculateByteUInt(tokenId: EthersBN, startByte: number, endByte: number) {
  const token = utils.arrayify(tokenId);
  let byteUInt = 0;
  for (let i = startByte; i <= endByte; i++) {
    byteUInt += token[i] * 256 ** (endByte - i);
  }
  return byteUInt;
}

/**
 * Converts the raw Token ID to an `Artifact` typescript typed object (see @dfdao/types).
 *
 * @param tokenId Raw `tokenId` representing an `Artifact` struct
 */
export function decodeArtifact(tokenId: EthersBN): Artifact {
  // These account for unknown at the 0-th index
  const tokenIdx = ArtifactInfo.TokenType - 1;
  const rarityIdx = ArtifactInfo.ArtifactRarity - 1;
  const typeIdx = ArtifactInfo.ArtifactType - 1;
  const biomeIdx = ArtifactInfo.Biome - 1;

  const _tokenType = calculateByteUInt(tokenId, tokenIdx, tokenIdx);
  const rarity = calculateByteUInt(tokenId, rarityIdx, rarityIdx);
  const artifactType = calculateByteUInt(tokenId, typeIdx, typeIdx);
  const biome = calculateByteUInt(tokenId, biomeIdx, biomeIdx);

  return {
    id: artifactIdFromEthersBN(tokenId),
    rarity: rarity as ArtifactRarity,
    planetBiome: biome as Biome,
    artifactType: artifactType as ArtifactType,
  };
}

export function isArtifact(tokenId: EthersBN): boolean {
  // These account for unknown at the 0-th index
  const tokenIdx = ArtifactInfo.TokenType - 1;

  const tokenType = calculateByteUInt(tokenId, tokenIdx, tokenIdx);

  return tokenType === TokenType.Artifact;
}
