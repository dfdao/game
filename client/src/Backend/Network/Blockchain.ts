import diamondContractAbiUrl from '@dfdao/contracts/abis/DarkForest.json?url';
import { createContract, createEthConnection, EthConnection } from '@dfdao/network';
import type { Contract, providers, Wallet } from 'ethers';

/**
 * Loads the game contract, which is responsible for updating the state of the game.
 */
export async function loadDiamondContract<T extends Contract>(
  address: string,
  provider: providers.JsonRpcProvider,
  signer?: Wallet
): Promise<T> {
  const abi = await fetch(diamondContractAbiUrl).then((r) => r.json());

  return createContract<T>(address, abi, provider, signer);
}

export function getEthConnection(): Promise<EthConnection> {
  const defaultUrl = import.meta.env.DF_DEFAULT_RPC as string;

  let url: string;

  if (import.meta.env.PROD) {
    url = localStorage.getItem('XDAI_RPC_ENDPOINT_v5') || defaultUrl;
  } else {
    url = 'http://localhost:8545';
  }

  console.log(`GAME METADATA:`);
  console.log(`rpc url: ${url}`);
  console.log(`is production: ${import.meta.env.PROD}`);
  console.log(`webserver url: ${import.meta.env.DF_WEBSERVER_URL}`);

  return createEthConnection(url);
}
