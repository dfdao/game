import type { DarkForest } from '@darkforest_eth/contracts/typechain';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, utils } from 'ethers';
import hre from 'hardhat';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deployAndCut, deployDiamondInit, deployLibraries } from '../../tasks/deploy';
import { initializers, noPlanetTransferInitializers, target4Initializers } from './WorldConstants';

export interface World {
  contract: DarkForest;
  user1: SignerWithAddress;
  user2: SignerWithAddress;
  deployer: SignerWithAddress;
  user1Core: DarkForest;
  user2Core: DarkForest;
}

export interface Player {
  isInitialized: boolean;
  player: string;
  initTimestamp: BigNumber;
  homePlanetId: BigNumber;
  lastRevealTimestamp: BigNumber;
  score: BigNumber;
}

export interface InitializeWorldArgs {
  initializers: HardhatRuntimeEnvironment['settings']['darkforest']['initializers'];
  whitelistEnabled: boolean;
}

export async function createArena(
  contract: DarkForest,
  initializers: HardhatRuntimeEnvironment['settings']['darkforest']['initializers']
): Promise<DarkForest> {
  const { LibGameUtils } = await deployLibraries({}, hre);
  const DFInitialize = await deployDiamondInit({}, { LibGameUtils }, hre);
  const initFunctionCall = DFInitialize.interface.encodeFunctionData('init', [
    false,
    '',
    initializers,
  ]);

  const newLobbyTx = await contract.createLobby(DFInitialize.address, initFunctionCall);
  await newLobbyTx.wait();
  const eventFilter = contract.filters.LobbyCreated();
  const events = await contract.queryFilter(eventFilter, 'latest');
  const { lobbyAddress } = events[0].args;
  const lobby = await hre.ethers.getContractAt('DarkForest', lobbyAddress);

  return lobby;
}

export function defaultWorldFixture(): Promise<World> {
  return initializeWorld({
    initializers,
    whitelistEnabled: false,
  });
}

export function growingWorldFixture(): Promise<World> {
  return initializeWorld({
    initializers: target4Initializers,
    whitelistEnabled: false,
  });
}

export function whilelistWorldFixture(): Promise<World> {
  return initializeWorld({
    initializers,
    whitelistEnabled: true,
  });
}

export function noPlanetTransferFixture(): Promise<World> {
  return initializeWorld({
    initializers: noPlanetTransferInitializers,
    whitelistEnabled: false,
  });
}

export async function initializeWorld({
  initializers,
  whitelistEnabled,
}: InitializeWorldArgs): Promise<World> {
  const [deployer, user1, user2] = await hre.ethers.getSigners();

  const [diamond, _initReceipt] = await deployAndCut(
    { ownerAddress: deployer.address, whitelistEnabled, initializers },
    hre
  );

  const contract = await hre.ethers.getContractAt('DarkForest', diamond.address);

  await deployer.sendTransaction({
    to: contract.address,
    value: utils.parseEther('0.5'), // good for about (100eth / 0.5eth/test) = 200 tests
  });
  return {
    // If any "admin only" contract state needs to be changed, use `contracts`
    // to call methods with deployer privileges. e.g. `world.contracts.core.pause()`
    contract,
    user1,
    user2,
    deployer,
    user1Core: contract.connect(user1),
    user2Core: contract.connect(user2),
  };
}
