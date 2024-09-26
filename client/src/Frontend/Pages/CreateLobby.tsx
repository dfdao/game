import { INIT_ADDRESS } from '@dfdao/contracts';
import initContractAbiUrl from '@dfdao/contracts/abis/DFInitialize.json?url';
import { DarkForest } from '@dfdao/contracts/typechain';
import { fakeHash, mimcHash } from '@dfdao/hashing';
import { EthConnection } from '@dfdao/network';
import { address, locationIdFromBigInt } from '@dfdao/serde';
import { decodeArenaAdminPlanets } from '@dfdao/settings';
import { ArtifactRarity, EthAddress, PlanetType, UnconfirmedCreateLobby } from '@dfdao/types';
import { Contract, providers } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ContractsAPI, makeContractsAPI } from '../../Backend/GameLogic/ContractsAPI';
import { loadDiamondContract } from '../../Backend/Network/Blockchain';
import { InitRenderState, Wrapper } from '../Components/GameLandingPageComponents';
import { ConfigurationPane } from '../Panes/Lobbies/ConfigurationPane';
import { Minimap } from '../Panes/Lobbies/MinimapPane';
import { MinimapConfig } from '../Panes/Lobbies/MinimapUtils';
import { LobbyInitializers } from '../Panes/Lobbies/Reducer';
import { listenForKeyboardEvents, unlinkKeyboardEvents } from '../Utils/KeyEmitters';
import { CadetWormhole } from '../Views/CadetWormhole';
import { LobbyLandingPage } from './LobbyLandingPage';

// TODO: Infer this from Dark Forest interface
function getLobbyCreatedEvent(
  lobbyReceipt: providers.TransactionReceipt,
  contract: DarkForest
): { owner: EthAddress; lobby: EthAddress } {
  const lobbyCreatedHash = keccak256(toUtf8Bytes('LobbyCreated(address,address)'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = lobbyReceipt.logs.find((log: any) => log.topics[0] === lobbyCreatedHash);
  if (log) {
    return {
      owner: address(contract.interface.parseLog(log).args.ownerAddress),
      lobby: address(contract.interface.parseLog(log).args.lobbyAddress),
    };
  } else {
    throw new Error('Lobby Created event not found');
  }
}

type ErrorState =
  | { type: 'invalidAddress' }
  | { type: 'contractLoad' }
  | { type: 'invalidContract' }
  | { type: 'invalidCreate' };

export function CreateLobby({ match }: RouteComponentProps<{ contract: string }>) {
  const [connection, setConnection] = useState<EthConnection | undefined>();
  const [contract, setContract] = useState<ContractsAPI | undefined>();
  const [startingConfig, setStartingConfig] = useState<LobbyInitializers | undefined>();
  const [lobbyAddress, setLobbyAddress] = useState<EthAddress | undefined>();
  const [minimapConfig, setMinimapConfig] = useState<MinimapConfig | undefined>();

  const onMapChange = useMemo(() => {
    return _.debounce((config: MinimapConfig) => setMinimapConfig(config), 500);
  }, [setMinimapConfig]);

  let contractAddress: EthAddress | undefined;
  try {
    contractAddress = address(match.params.contract);
  } catch (err) {
    console.error('Invalid address', err);
  }

  const [errorState, setErrorState] = useState<ErrorState | undefined>(
    contractAddress ? undefined : { type: 'invalidAddress' }
  );

  useEffect(() => {
    listenForKeyboardEvents();

    return () => unlinkKeyboardEvents();
  }, []);

  const onReady = useCallback(
    (connection: EthConnection) => {
      setConnection(connection);
    },
    [setConnection]
  );

  useEffect(() => {
    if (connection && contractAddress) {
      makeContractsAPI({ connection, contractAddress })
        .then((contract) => setContract(contract))
        .catch((e) => {
          console.log(e);
          setErrorState({ type: 'contractLoad' });
        });
    }
  }, [connection, contractAddress]);

  useEffect(() => {
    if (contract) {
      contract
        .getConstants()
        .then((config) => {
          setStartingConfig({
            ...config,
            // Explicitly defaulting this to false
            WHITELIST_ENABLED: false,
            // TODO: Figure out if we should expose this from contract
            START_PAUSED: false,
            // TODO: Implement... Needs a datetime input component (WIP)
            TOKEN_MINT_END_TIMESTAMP: 1948939200, // new Date("2031-10-05T04:00:00.000Z").getTime() / 1000,
            ARTIFACT_POINT_VALUES: [
              config.ARTIFACT_POINT_VALUES[ArtifactRarity.Unknown],
              config.ARTIFACT_POINT_VALUES[ArtifactRarity.Common],
              config.ARTIFACT_POINT_VALUES[ArtifactRarity.Rare],
              config.ARTIFACT_POINT_VALUES[ArtifactRarity.Epic],
              config.ARTIFACT_POINT_VALUES[ArtifactRarity.Legendary],
              config.ARTIFACT_POINT_VALUES[ArtifactRarity.Mythic],
            ],
            MANUAL_SPAWN: true,
            TARGETS_REQUIRED_FOR_VICTORY: 1,
            CLAIM_VICTORY_ENERGY_PERCENT: 20,
          });
        })
        .catch((e) => {
          console.log(e);
          setErrorState({ type: 'invalidContract' });
        });
    }
  }, [contract]);

  async function createLobby(config: LobbyInitializers) {
    if (!contract) {
      setErrorState({ type: 'invalidCreate' });
      return;
    }

    const initializers = { ...startingConfig, ...config };

    console.log(initializers);
    const InitABI = await fetch(initContractAbiUrl).then((r) => r.json());
    const artifactBaseURI = '';
    const initInterface = Contract.getInterface(InitABI);
    const initAddress = INIT_ADDRESS;
    const initFunctionCall = initInterface.encodeFunctionData('init', [
      initializers,
      {
        allowListEnabled: initializers.WHITELIST_ENABLED,
        baseURI: artifactBaseURI,
        allowedAddresses: [],
      },
    ]);
    const txIntent: UnconfirmedCreateLobby = {
      methodName: 'createLobby',
      contract: contract.contract,
      args: Promise.resolve([initAddress, initFunctionCall]),
    };

    const tx = await contract.submitTransaction(txIntent, {
      // The createLobby function costs somewhere around 12mil gas
      gasLimit: '15000000',
    });
    const rct = await tx.confirmedPromise;
    const { lobby } = getLobbyCreatedEvent(rct, contract.contract);
    // Call Start
    const newLobby = await contract.ethConnection.loadContract<DarkForest>(
      lobby,
      loadDiamondContract
    );
    const startTx = await newLobby.start();
    console.log(`start submitted`);
    const startRct = await startTx.wait();
    console.log(`start confirmed with ${startRct.gasUsed} gas`);
    const planetHashMimc = config.DISABLE_ZK_CHECKS
      ? fakeHash(config.PLANET_RARITY)
      : mimcHash(config.PLANETHASH_KEY);

    console.log(`creating planets...`);
    const coords = { x: 0, y: 0 };
    const planets = [
      {
        location: `0x` + locationIdFromBigInt(planetHashMimc(coords.x, coords.y)),
        x: coords.x,
        y: coords.y,
        perlin: 20,
        level: 5,
        planetType: PlanetType.SILVER_MINE,
        requireValidLocationId: false,
        isTargetPlanet: false,
        isSpawnPlanet: true,
        blockedPlanetIds: [],
      },
      {
        location: `0x` + locationIdFromBigInt(planetHashMimc(100, 100)),
        x: 100,
        y: 100,
        perlin: 20,
        level: 3,
        planetType: PlanetType.SILVER_BANK,
        requireValidLocationId: false,
        isTargetPlanet: true,
        isSpawnPlanet: false,
        blockedPlanetIds: [],
      },
    ];
    const createTx = await newLobby.bulkCreateAndReveal(decodeArenaAdminPlanets(planets));
    const createRct = await createTx.wait();
    console.log(`create planets confirmed with ${createRct.gasUsed} gas`);

    setLobbyAddress(lobby);
  }

  if (errorState) {
    switch (errorState.type) {
      case 'contractLoad':
        return <CadetWormhole imgUrl='/img/wrong-text.png' />;
      case 'invalidAddress':
      case 'invalidContract':
        return <CadetWormhole imgUrl='/img/no-contract-text.png' />;
      case 'invalidCreate':
        return <CadetWormhole imgUrl='/img/wrong-text.png' />;
      default:
        // https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
        const _exhaustive: never = errorState;
        return _exhaustive;
    }
  }
  let content;
  if (startingConfig) {
    content = (
      <>
        <ConfigurationPane
          modalIndex={2}
          lobbyAddress={lobbyAddress}
          startingConfig={startingConfig}
          onMapChange={onMapChange}
          onCreate={createLobby}
        />
        {/* Minimap uses modalIndex=1 so it is always underneath the configuration pane */}
        <Minimap modalIndex={1} config={minimapConfig} />
      </>
    );
  } else {
    content = <LobbyLandingPage onReady={onReady} />;
  }

  return (
    <Wrapper initRender={InitRenderState.NONE} terminalEnabled={false}>
      {content}
    </Wrapper>
  );
}
