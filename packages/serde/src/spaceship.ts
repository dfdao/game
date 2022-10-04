import { Spaceship, SpaceshipId, SpaceshipInfo, SpaceshipType, TokenType } from '@dfdao/types';
import bigInt from 'big-integer';
import { BigNumber as EthersBN, utils } from 'ethers';

/**
 * Converts a possibly 0x-prefixed string of hex digits to an `SpaceshipId`: a
 * non-0x-prefixed all lowercase hex string of exactly 64 hex characters
 * (0-padded if necessary). Spaceship IDs should only be instantiated through
 * `spaceshipIdFromHexStr`, `spaceshipIdFromDecStr`, and `spaceshipIdFromEthersBN`.
 *
 * @param spaceshipId Possibly 0x-prefixed, possibly unpadded hex `string`
 * representation of an spaceship's ID.
 */
export function spaceshipIdFromHexStr(spaceshipId: string): SpaceshipId {
  const spaceshipIdBI = bigInt(spaceshipId, 16);
  let ret = spaceshipIdBI.toString(16);
  if (ret.length > 64) throw new Error('not a valid spaceship id');
  while (ret.length < 64) ret = '0' + ret;
  return ret as SpaceshipId;
}

/**
 * Converts a string representing a decimal number into an SpaceshipID: a
 * non-0x-prefixed all lowercase hex string of exactly 64 hex characters
 * (0-padded if necessary). Spaceship IDs should only be instantiated through
 * `spaceshipIdFromHexStr`, `spaceshipIdFromDecStr`, and `spaceshipIdFromEthersBN`.
 *
 * @param spaceshipId `string` of decimal digits, the base 10 representation of an
 * spaceship ID.
 */
export function spaceshipIdFromDecStr(spaceshipId: string): SpaceshipId {
  const locationBI = bigInt(spaceshipId);
  let ret = locationBI.toString(16);
  while (ret.length < 64) ret = '0' + ret;
  return ret as SpaceshipId;
}

/**
 * Converts a ethers.js BigNumber (type aliased here as EthersBN) representing a
 * decimal number into an SpaceshipID: a non-0x-prefixed all lowercase hex string
 * of exactly 64 hex characters (0-padded if necessary). Spaceship IDs should only
 * be instantiated through `spaceshipIdFromHexStr`, `spaceshipIdFromDecStr`, and
 * `spaceshipIdFromEthersBN`.
 *
 * @param spaceshipId ether.js `BigNumber` representing spaceship's ID
 */
export function spaceshipIdFromEthersBN(spaceshipId: EthersBN): SpaceshipId {
  return spaceshipIdFromDecStr(spaceshipId.toString());
}

/**
 * Converts an SpaceshipID to a decimal string with equivalent numerical value;
 * can be used if you need to pass an spaceship ID into a web3 call.
 *
 * @param spaceshipId non-0x-prefixed lowercase hex `string` of 64 hex characters
 * representing an spaceship's ID
 */
export function spaceshipIdToDecStr(spaceshipId: SpaceshipId): string {
  return bigInt(spaceshipId, 16).toString(10);
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
 * Converts the raw Token ID to an `Spaceship` typescript typed object (see @dfdao/types).
 *
 * @param tokenId Raw `tokenId` representing an `Spaceship` struct
 */
export function decodeSpaceship(tokenId: EthersBN): Spaceship {
  // These account for unknown at the 0-th index
  const tokenIdx = SpaceshipInfo.TokenType - 1;
  const typeIdx = SpaceshipInfo.SpaceshipType - 1;

  const _tokenType = calculateByteUInt(tokenId, tokenIdx, tokenIdx);
  const spaceshipType = calculateByteUInt(tokenId, typeIdx, typeIdx);

  return {
    id: spaceshipIdFromEthersBN(tokenId),
    spaceshipType: spaceshipType as SpaceshipType,
  };
}

export function isSpaceship(tokenId: EthersBN): boolean {
  // These account for unknown at the 0-th index
  const tokenIdx = SpaceshipInfo.TokenType - 1;

  const tokenType = calculateByteUInt(tokenId, tokenIdx, tokenIdx);

  return tokenType === TokenType.Spaceship;
}
