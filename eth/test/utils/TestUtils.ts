import type { DarkForest } from '@dfdao/contracts/typechain';
import { ArtifactStructOutput } from '@dfdao/contracts/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/DarkForest';
import { modPBigInt } from '@dfdao/hashing';
import {
  buildContractCallArgs,
  SnarkJSProofAndSignals,
  WhitelistSnarkContractCallArgs,
  WhitelistSnarkInput,
} from '@dfdao/snarks';
import { whitelistSnarkWasmPath, whitelistSnarkZkeyPath } from '@dfdao/snarks/node';
import {
  ArtifactRarity,
  ArtifactRarityNames,
  ArtifactType,
  ArtifactTypeNames,
  Biome,
  BiomeNames,
  SpaceshipType,
  TokenTypeNames,
} from '@dfdao/types';
import { bigIntFromKey } from '@dfdao/whitelist';
import { mine, time } from '@nomicfoundation/hardhat-network-helpers';
import bigInt from 'big-integer';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import hre from 'hardhat';
// @ts-ignore
import * as snarkjs from 'snarkjs';
import { TestLocation } from './TestLocation';
import { World } from './TestWorld';
import { ARTIFACT_PLANET_1, initializers, LARGE_INTERVAL } from './WorldConstants';
const {
  PLANETHASH_KEY,
  SPACETYPE_KEY,
  BIOMEBASE_KEY,
  PERLIN_LENGTH_SCALE,
  PERLIN_MIRROR_X,
  PERLIN_MIRROR_Y,
} = initializers;

export const ZERO_ADDRESS = constants.AddressZero;
export const BN_ZERO = constants.Zero;

export function hexToBigNumber(hex: string): BigNumber {
  return BigNumber.from(`0x${hex}`);
}

export function prettyPrintToken(token: ArtifactStructOutput) {
  console.log(
    `~Token~\nID: ${token.id}\nCollection: ${TokenTypeNames[token.tokenType]}\nRarity: ${
      ArtifactRarityNames[token.rarity]
    }\nType: ${ArtifactTypeNames[token.artifactType]}\nBiome: ${BiomeNames[token.planetBiome]}`
  );
}

export function makeRevealArgs(
  planetLoc: TestLocation,
  x: number,
  y: number
): [
  [BigNumberish, BigNumberish],
  [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]],
  [BigNumberish, BigNumberish],
  [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ]
] {
  return [
    [BN_ZERO, BN_ZERO],
    [
      [BN_ZERO, BN_ZERO],
      [BN_ZERO, BN_ZERO],
    ],
    [BN_ZERO, BN_ZERO],
    [
      planetLoc.id,
      planetLoc.perlin,
      modPBigInt(x).toString(),
      modPBigInt(y).toString(),
      PLANETHASH_KEY,
      SPACETYPE_KEY,
      PERLIN_LENGTH_SCALE,
      PERLIN_MIRROR_X ? '1' : '0',
      PERLIN_MIRROR_Y ? '1' : '0',
    ],
  ];
}

export async function makeWhitelistArgs(key: string, recipient: string) {
  const input: WhitelistSnarkInput = {
    key: bigIntFromKey(key).toString(),
    recipient: bigInt(recipient.substring(2), 16).toString(),
  };

  const fullProveResponse = await snarkjs.groth16.fullProve(
    input,
    whitelistSnarkWasmPath,
    whitelistSnarkZkeyPath
  );
  const { proof, publicSignals }: SnarkJSProofAndSignals = fullProveResponse;
  return buildContractCallArgs(proof, publicSignals) as WhitelistSnarkContractCallArgs;
}

export function makeInitArgs(
  planetLoc: TestLocation,
  spawnRadius: number = initializers.WORLD_RADIUS_MIN
): [
  [BigNumberish, BigNumberish],
  [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]],
  [BigNumberish, BigNumberish],
  [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ]
] {
  return [
    [BN_ZERO, BN_ZERO],
    [
      [BN_ZERO, BN_ZERO],
      [BN_ZERO, BN_ZERO],
    ],
    [BN_ZERO, BN_ZERO],
    [
      planetLoc.id,
      planetLoc.perlin,
      spawnRadius,
      PLANETHASH_KEY,
      SPACETYPE_KEY,
      PERLIN_LENGTH_SCALE,
      PERLIN_MIRROR_X ? '1' : '0',
      PERLIN_MIRROR_Y ? '1' : '0',
    ],
  ];
}

export function makeMoveArgs(
  oldLoc: TestLocation,
  newLoc: TestLocation,
  maxDist: BigNumberish,
  popMoved: BigNumberish,
  silverMoved: BigNumberish,
  movedArtifactId: BigNumberish = 0,
  abandoning: BigNumberish = 0
): [
  [BigNumberish, BigNumberish],
  [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]],
  [BigNumberish, BigNumberish],
  [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ],
  BigNumberish,
  BigNumberish,
  BigNumberish,
  BigNumberish
] {
  return [
    [0, 0],
    [
      [0, 0],
      [0, 0],
    ],
    [0, 0],
    [
      oldLoc.id,
      newLoc.id,
      newLoc.perlin,
      newLoc.distFromOrigin + 1,
      maxDist,
      PLANETHASH_KEY,
      SPACETYPE_KEY,
      PERLIN_LENGTH_SCALE,
      PERLIN_MIRROR_X ? '1' : '0',
      PERLIN_MIRROR_Y ? '1' : '0',
    ],
    popMoved,
    silverMoved,
    movedArtifactId,
    abandoning,
  ];
}

export function makeFindArtifactArgs(
  location: TestLocation
): [
  [BigNumberish, BigNumberish],
  [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]],
  [BigNumberish, BigNumberish],
  [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish]
] {
  return [
    [1, 2],
    [
      [1, 2],
      [3, 4],
    ],
    [5, 6],
    [
      location.id,
      1,
      PLANETHASH_KEY,
      BIOMEBASE_KEY,
      PERLIN_LENGTH_SCALE,
      PERLIN_MIRROR_X ? '1' : '0',
      PERLIN_MIRROR_Y ? '1' : '0',
    ],
  ];
}

/**
 * interval is measured in seconds
 */
export async function increaseBlockchainTime(interval = LARGE_INTERVAL) {
  await time.increase(interval);
  await mine();
}

export async function getCurrentTime() {
  return time.latest();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getStatSum(planet: any) {
  let statSum = 0;
  for (const stat of ['speed', 'range', 'defense', 'populationCap', 'populationGrowth']) {
    statSum += planet[stat].toNumber();
  }
  return statSum;
}

// conquers an untouched planet `to` by repeatedly sending attacks from `from`
// assumes that `to` is owned by `signer` and that `from` is an unowned planet
// throws if `to` is owned
export async function conquerUnownedPlanet(
  world: World,
  signer: DarkForest,
  from: TestLocation,
  to: TestLocation
) {
  const fromData = await world.contract.planets(from.id);
  let toData = await world.contract.planets(to.id);
  if (toData.owner !== ZERO_ADDRESS) {
    throw new Error('called conquerUnownedPlanet to conquer owned planet');
  }
  const attackEnergyCost = fromData.populationCap.toNumber() * 0.9;
  await increaseBlockchainTime();
  await (await signer.move(...makeMoveArgs(from, to, 0, attackEnergyCost, 0))).wait(); // creates planet in contract
  toData = await world.contract.planets(to.id);
  const toPlanetStartingPop = toData.population.toNumber(); // move hasn't yet been applied

  await (await signer.refreshPlanet(to.id)).wait(); // applies move, since 0 moveDist
  toData = await world.contract.planets(to.id);

  if (toData.owner === ZERO_ADDRESS) {
    // send additional attacks if not yet conquered
    const attackDamage = toPlanetStartingPop - toData.population.toNumber();
    const attacksNeeded = Math.floor(toData.population.toNumber() / attackDamage) + 1;
    for (let i = 0; i < attacksNeeded; i++) {
      await increaseBlockchainTime();
      await signer.move(...makeMoveArgs(from, to, 0, attackEnergyCost, 0));
    }
  }
}

// shuttles silver from `silverProducer` to `to` until `to` is maxed on silver
export async function feedSilverToCap(
  world: World,
  signer: DarkForest,
  silverMine: TestLocation,
  to: TestLocation
) {
  const silverMineData = await world.contract.planets(silverMine.id);
  const toData = await world.contract.planets(to.id);
  const attackEnergyCost = silverMineData.populationCap.toNumber() * 0.1;
  const silverMineSilverCap = silverMineData.silverCap.toNumber();
  const toSilverCap = toData.silverCap.toNumber();

  for (let i = 0; i < Math.ceil(toSilverCap / silverMineSilverCap); i++) {
    await increaseBlockchainTime();
    await signer.move(...makeMoveArgs(silverMine, to, 0, attackEnergyCost, silverMineSilverCap));
  }
}

// returns the ID of the artifact minted
export async function user1MintArtifactPlanet(user1Core: DarkForest) {
  await user1Core.prospectPlanet(ARTIFACT_PLANET_1.id);
  await increaseBlockchainTime();
  const findArtifactTx = await user1Core.findArtifact(...makeFindArtifactArgs(ARTIFACT_PLANET_1));
  const findArtifactReceipt = await findArtifactTx.wait();
  // 0th event is erc721 transfer (i think); 1st event is UpdateArtifact, 2nd argument of this event
  // is artifactId
  const artifactId = findArtifactReceipt.events?.[1].args?.artifactId;
  return artifactId as BigNumber;
}

export async function getArtifactsOwnedBy(contract: DarkForest, addr: string) {
  return await contract.getPlayerArtifacts(addr);
}

// Gets Artifacts but not Spaceships
export async function getArtifactsOnPlanet(world: World, locationId: BigNumberish) {
  return await world.contract.getArtifactsOnPlanet(locationId);
}

export async function getArtifactTypeOnPlanet(
  world: World,
  locationId: BigNumberish,
  artifactType: ArtifactType
) {
  return (await world.contract.getArtifactsOnPlanet(locationId)).filter(
    (artifact) => artifact.artifactType === artifactType
  );
}

export async function createArtifact(
  contract: DarkForest,
  owner: string,
  planet: TestLocation,
  artifactType: ArtifactType,
  rarity?: ArtifactRarity,
  biome?: Biome
) {
  rarity ||= ArtifactRarity.Common;
  biome ||= Biome.FOREST;

  const tokenId = await contract.createArtifactId(rarity, artifactType, biome);
  await contract.adminGiveArtifact({
    tokenId,
    discoverer: owner,
    owner: owner,
    planetId: planet.id,
    rarity: rarity.toString(),
    biome: biome.toString(),
    artifactType: artifactType.toString(),
    controller: ZERO_ADDRESS,
  });

  return tokenId;
}

export async function testDeactivate(world: World, locationId: BigNumberish) {
  expect((await getArtifactsOnPlanet(world, locationId)).length).to.equal(0);
  expect(await world.contract.hasActiveArtifact(locationId)).to.equal(false);
  expect(await world.contract.getArtifactActivationTimeOnPlanet(locationId)).to.equal(0);
}

export async function activateAndConfirm(
  contract: DarkForest,
  locationId: BigNumber,
  tokenId: BigNumberish,
  wormHoleTo?: BigNumberish
) {
  const activateTx = await contract.activateArtifact(locationId, tokenId, wormHoleTo || 0);
  const activateRct = await activateTx.wait();
  const block = await hre.ethers.provider.getBlock(activateRct.blockNumber);
  expect(await contract.getArtifactActivationTimeOnPlanet(locationId)).to.equal(block.timestamp);
  expect((await contract.getActiveArtifactOnPlanet(locationId)).id).to.equal(tokenId);
}

export async function getArtifactOnPlanetByType(
  contract: DarkForest,
  locationId: BigNumber,
  artifactType: ArtifactType
) {
  return (await contract.getArtifactsOnPlanet(locationId)).filter(
    (artifact) => (artifact.artifactType as ArtifactType) === artifactType
  )[0];
}

export async function getSpaceshipOnPlanetByType(
  contract: DarkForest,
  locationId: BigNumber,
  shipType: SpaceshipType
) {
  return (await contract.getSpaceshipsOnPlanet(locationId)).filter(
    (s) => (s.spaceshipType as SpaceshipType) === shipType
  )[0];
}
