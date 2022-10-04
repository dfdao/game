import { time } from '@nomicfoundation/hardhat-network-helpers';
import delay from 'delay';
import * as fs from 'fs';
import { task, types } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, Libraries } from 'hardhat/types';
import * as path from 'path';
import { dedent } from 'ts-dedent';
import { DiamondChanges } from '../utils/diamond';
import { tscompile } from '../utils/tscompile';

task('deploy', 'deploy all contracts')
  .addOptionalParam('whitelist', 'override the whitelist', undefined, types.boolean)
  .addOptionalParam('fund', 'amount of eth to fund whitelist contract for fund', 0.5, types.float)
  .addOptionalParam(
    'subgraph',
    'bring up subgraph with name (requires docker)',
    undefined,
    types.string
  )
  .setAction(deploy);

async function deploy(
  args: { whitelist?: boolean; fund: number; subgraph?: string },
  hre: HardhatRuntimeEnvironment
) {
  const isLocalhost = hre.network.name === 'localhost';
  const isHardhat = hre.network.name === 'hardhat';
  const isDev = isLocalhost || isHardhat;

  let whitelistEnabled: boolean;
  if (typeof args.whitelist === 'undefined') {
    // `whitelistEnabled` defaults to `false` in dev but `true` in prod
    whitelistEnabled = isDev ? false : true;
  } else {
    whitelistEnabled = args.whitelist;
  }

  // need to force a compile for tasks
  await hre.run('compile');

  // Were only using one account, getSigners()[0], the deployer.
  // Is deployer of all contracts, but ownership is transferred to ADMIN_PUBLIC_ADDRESS if set
  const [deployer] = await hre.ethers.getSigners();

  const requires = hre.ethers.utils.parseEther('2.1');
  const balance = await deployer.getBalance();

  // Only when deploying to production, give the deployer wallet money,
  // in order for it to be able to deploy the contracts
  if (!isDev && balance.lt(requires)) {
    throw new Error(
      `${deployer.address} requires ~$${hre.ethers.utils.formatEther(
        requires
      )} but has ${hre.ethers.utils.formatEther(balance)} top up and rerun`
    );
  }

  const [diamond, diamondInit, initReceipt] = await deployAndCut(
    {
      ownerAddress: deployer.address,
      whitelistEnabled,
      initializers: hre.settings.darkforest.initializers,
    },
    hre
  );

  await saveDeploy(
    {
      coreBlockNumber: initReceipt.blockNumber,
      diamondAddress: diamond.address,
      initAddress: diamondInit.address,
    },
    hre
  );

  // Note Ive seen `ProviderError: Internal error` when not enough money...
  console.log(`funding whitelist with ${args.fund}`);

  const tx = await deployer.sendTransaction({
    to: diamond.address,
    value: hre.ethers.utils.parseEther(args.fund.toString()),
  });
  await tx.wait();

  console.log(
    `Sent ${args.fund} to diamond contract (${diamond.address}) to fund drips in whitelist facet`
  );

  // give all contract administration over to an admin adress if was provided
  if (hre.ADMIN_PUBLIC_ADDRESS) {
    const ownership = await hre.ethers.getContractAt('DarkForest', diamond.address);
    const tx = await ownership.transferOwnership(hre.ADMIN_PUBLIC_ADDRESS);
    await tx.wait();
    console.log(`transfered diamond ownership to ${hre.ADMIN_PUBLIC_ADDRESS}`);
  }

  if (isLocalhost) {
    // The subgraph local docker crashes if we aren't in automine mode
    // so don't switch to interval mining if the `--subgraph` flag was passed
    if (args.subgraph) {
      await hre.run('subgraph:deploy', { name: args.subgraph });
      console.log('deployed subgraph');
    } else {
      // Disable automining because it produces timestamps ahead of the wall clock
      await hre.network.provider.send('evm_setAutomine', [false]);

      // Chain time operates on seconds
      const now = Math.floor(Date.now() / 1000);

      const blockTime = await time.latest();

      // Hardhat crashes if you try to set block timestamp to a previous time,
      // so we need to wait and catch up to the wall clock
      if (now <= blockTime) {
        const waitTime = blockTime - now + 1; // One extra second
        console.log(`Waiting ${waitTime} seconds for clock time to catch up to block time`);
        await delay(waitTime * 1000);
      }

      await time.setNextBlockTimestamp(new Date());

      await hre.network.provider.send('evm_setIntervalMining', [1000]);
    }
  }

  const whitelistBalance = await hre.ethers.provider.getBalance(diamond.address);
  console.log(`Whitelist balance ${whitelistBalance}`);

  // TODO: Upstream change to update task name from `hardhat-4byte-uploader`
  if (!isDev) {
    try {
      await hre.run('upload-selectors', { noCompile: true });
    } catch {
      console.warn('WARNING: Unable to update 4byte database with our selectors');
      console.warn('Please run the `upload-selectors` task manually so selectors can be reversed');
    }
  }

  console.log('Deployed successfully. Godspeed cadet.');
}

async function saveDeploy(
  args: {
    coreBlockNumber: number;
    diamondAddress: string;
    initAddress: string;
  },
  hre: HardhatRuntimeEnvironment
) {
  const isDev = hre.network.name === 'localhost' || hre.network.name === 'hardhat';

  // Save the addresses of the deployed contracts to the `@dfdao/contracts` package
  const tsContents = dedent`
  /**
   * This package contains deployed contract addresses, ABIs, and Typechain types
   * for the Dark Forest game.
   *
   * ## Installation
   *
   * You can install this package using [\`npm\`](https://www.npmjs.com) or
   * [\`yarn\`](https://classic.yarnpkg.com/lang/en/) by running:
   *
   * \`\`\`bash
   * npm install --save @dfdao/contracts
   * \`\`\`
   * \`\`\`bash
   * yarn add @dfdao/contracts
   * \`\`\`
   *
   * When using this in a plugin, you might want to load it with [skypack](https://www.skypack.dev)
   *
   * \`\`\`js
   * import * as contracts from 'http://cdn.skypack.dev/@dfdao/contracts'
   * \`\`\`
   *
   * ## Typechain
   *
   * The Typechain types can be found in the \`typechain\` directory.
   *
   * ## ABIs
   *
   * The contract ABIs can be found in the \`abis\` directory.
   *
   * @packageDocumentation
   */

  /**
   * The name of the network where these contracts are deployed.
   */
  export const NETWORK = '${hre.network.name}';
  /**
   * The id of the network where these contracts are deployed.
   */
  export const NETWORK_ID = ${hre.network.config.chainId};
  /**
   * The block in which the DarkForest contract was initialized.
   */
  export const START_BLOCK = ${isDev ? 0 : args.coreBlockNumber};
  /**
   * The address for the DarkForest contract.
   */
  export const CONTRACT_ADDRESS = '${args.diamondAddress}';
  /**
   * The address for the initalizer contract. Useful for lobbies.
   */
  export const INIT_ADDRESS = '${args.initAddress}';
  `;

  const { jsContents, jsmapContents, dtsContents, dtsmapContents } = tscompile(tsContents);

  const contractsFileTS = path.join(hre.packageDirs['@dfdao/contracts'], 'index.ts');
  const contractsFileJS = path.join(hre.packageDirs['@dfdao/contracts'], 'index.js');
  const contractsFileJSMap = path.join(hre.packageDirs['@dfdao/contracts'], 'index.js.map');
  const contractsFileDTS = path.join(hre.packageDirs['@dfdao/contracts'], 'index.d.ts');
  const contractsFileDTSMap = path.join(hre.packageDirs['@dfdao/contracts'], 'index.d.ts.map');

  fs.writeFileSync(contractsFileTS, tsContents);
  fs.writeFileSync(contractsFileJS, jsContents);
  fs.writeFileSync(contractsFileJSMap, jsmapContents);
  fs.writeFileSync(contractsFileDTS, dtsContents);
  fs.writeFileSync(contractsFileDTSMap, dtsmapContents);
}

export async function deployAndCut(
  {
    whitelistEnabled,
    initializers,
  }: {
    ownerAddress: string;
    whitelistEnabled: boolean;
    initializers: HardhatRuntimeEnvironment['settings']['darkforest']['initializers'];
  },
  hre: HardhatRuntimeEnvironment
) {
  const isDev = hre.network.name === 'localhost' || hre.network.name === 'hardhat';

  const changes = new DiamondChanges();

  const libraries = await deployLibraries({}, hre);

  const diamond = await deployDiamond({}, hre);

  const diamondInit = await deployDiamondInit({}, libraries, hre);

  // Dark Forest facets
  const coreFacet = await deployCoreFacet({}, libraries, hre);
  const moveFacet = await deployMoveFacet({}, libraries, hre);
  const captureFacet = await deployCaptureFacet({}, libraries, hre);
  const tokenFacet = await deployTokenFacet({}, libraries, hre);
  const artifactFacet = await deployArtifactFacet(
    { diamondAddress: diamond.address },
    libraries,
    hre
  );
  const getterFacet = await deployGetterFacet({}, libraries, hre);
  const spaceshipFacet = await deploySpaceshipFacet({}, libraries, hre);
  const whitelistFacet = await deployWhitelistFacet({}, libraries, hre);
  const verifierFacet = await deployVerifierFacet({}, libraries, hre);
  const adminFacet = await deployAdminFacet({}, libraries, hre);
  const lobbyFacet = await deployLobbyFacet({}, {}, hre);
  const rewardFacet = await deployRewardFacet({}, {}, hre);

  // The `cuts` to perform for Dark Forest facets
  const darkForestFacetCuts = [
    ...changes.getFacetCuts('DFCoreFacet', coreFacet),
    ...changes.getFacetCuts('DFMoveFacet', moveFacet),
    ...changes.getFacetCuts('DFCaptureFacet', captureFacet),
    ...changes.getFacetCuts('DFArtifactFacet', artifactFacet),
    ...changes.getFacetCuts('DFGetterFacet', getterFacet),
    ...changes.getFacetCuts('DFWhitelistFacet', whitelistFacet),
    ...changes.getFacetCuts('DFVerifierFacet', verifierFacet),
    ...changes.getFacetCuts('DFAdminFacet', adminFacet),
    ...changes.getFacetCuts('DFLobbyFacet', lobbyFacet),
    ...changes.getFacetCuts('DFRewardFacet', rewardFacet),
    ...changes.getFacetCuts('DFSpaceshipFacet', spaceshipFacet),
    ...changes.getFacetCuts('DFTokenFacet', tokenFacet),
  ];

  if (isDev) {
    const debugFacet = await deployDebugFacet({}, libraries, hre);
    darkForestFacetCuts.push(...changes.getFacetCuts('DFDebugFacet', debugFacet));
  }

  const toCut = [...darkForestFacetCuts];

  const diamondCut = await hre.ethers.getContractAt('DarkForest', diamond.address);

  const tokenBaseUri = `${
    isDev
      ? 'https://nft-test.zkga.me/token-uri/artifact/'
      : 'https://nft.zkga.me/token-uri/artifact/'
  }${hre.network.config?.chainId || 'unknown'}-${diamond.address}/`;

  // EIP-2535 specifies that the `diamondCut` function takes two optional
  // arguments: address _init and bytes calldata _calldata
  // These arguments are used to execute an arbitrary function using delegatecall
  // in order to set state variables in the diamond during deployment or an upgrade
  // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
  const initAddress = diamondInit.address;
  const initFunctionCall = diamondInit.interface.encodeFunctionData('init', [
    whitelistEnabled,
    tokenBaseUri,
    initializers,
  ]);

  const initTx = await diamondCut.diamondCut(toCut, initAddress, initFunctionCall);
  const initReceipt = await initTx.wait();
  if (!initReceipt.status) {
    throw Error(`Diamond cut failed: ${initTx.hash}`);
  }
  console.log('Completed diamond cut');

  return [diamond, diamondInit, initReceipt] as const;
}
export async function deploySpaceshipFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFSpaceshipFacet', {
    libraries: {},
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log('DFSpacehipFacet deployed to:', contract.address);
  return contract;
}

export async function deployGetterFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFGetterFacet', {
    libraries: {},
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log('DFGetterFacet deployed to:', contract.address);
  return contract;
}

export async function deployAdminFacet(
  {},
  { LibGameUtils, LibPlanet }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('DFAdminFacet', {
    libraries: {
      LibGameUtils,
      LibPlanet,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFAdminFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployDebugFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFDebugFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFDebugFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployWhitelistFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFWhitelistFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFWhitelistFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployRewardFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFRewardFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFRewardFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployVerifierFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFVerifierFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFVerifierFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployTokenFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFTokenFacet', {
    libraries: {},
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFTokenFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployArtifactFacet(
  {},
  { LibGameUtils, LibPlanet, LibArtifactUtils }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('DFArtifactFacet', {
    libraries: {
      LibArtifactUtils,
      LibGameUtils,
      LibPlanet,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFArtifactFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployLibraries({}, hre: HardhatRuntimeEnvironment) {
  const LibGameUtilsFactory = await hre.ethers.getContractFactory('LibGameUtils');
  const LibGameUtils = await LibGameUtilsFactory.deploy();
  await LibGameUtils.deployTransaction.wait();

  const LibLazyUpdateFactory = await hre.ethers.getContractFactory('LibLazyUpdate');
  const LibLazyUpdate = await LibLazyUpdateFactory.deploy();
  await LibLazyUpdate.deployTransaction.wait();

  const LibArtifactUtilsFactory = await hre.ethers.getContractFactory('LibArtifactUtils', {
    libraries: {
      LibGameUtils: LibGameUtils.address,
    },
  });

  const LibArtifactUtils = await LibArtifactUtilsFactory.deploy();
  await LibArtifactUtils.deployTransaction.wait();

  const LibPlanetFactory = await hre.ethers.getContractFactory('LibPlanet', {
    libraries: {
      LibGameUtils: LibGameUtils.address,
      LibLazyUpdate: LibLazyUpdate.address,
    },
  });
  const LibPlanet = await LibPlanetFactory.deploy();
  await LibPlanet.deployTransaction.wait();

  return {
    LibGameUtils: LibGameUtils.address,
    LibPlanet: LibPlanet.address,
    LibArtifactUtils: LibArtifactUtils.address,
  };
}

export async function deployCoreFacet(
  {},
  { LibGameUtils, LibPlanet }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('DFCoreFacet', {
    libraries: {
      LibGameUtils,
      LibPlanet,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFCoreFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployMoveFacet(
  {},
  { LibGameUtils, LibArtifactUtils, LibPlanet }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('DFMoveFacet', {
    libraries: {
      LibGameUtils,
      LibArtifactUtils,
      LibPlanet,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFMoveFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployCaptureFacet(
  {},
  { LibPlanet }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('DFCaptureFacet', {
    libraries: {
      LibPlanet,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFCaptureFacet deployed to: ${contract.address}`);
  return contract;
}

async function deployDiamond({}, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFDiamond');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`Diamond deployed to: ${contract.address}`);
  return contract;
}

export async function deployDiamondInit(
  {},
  { LibGameUtils }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  // DFInitialize provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const factory = await hre.ethers.getContractFactory('DFInitialize', {
    libraries: { LibGameUtils },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFInitialize deployed to: ${contract.address}`);
  return contract;
}

export async function deployLobbyFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DFLobbyFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DFLobbyFacet deployed to: ${contract.address}`);
  return contract;
}
