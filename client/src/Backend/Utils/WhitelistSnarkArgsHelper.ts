import {
  buildContractCallArgs,
  SnarkJSProofAndSignals,
  WhitelistSnarkContractCallArgs,
  WhitelistSnarkInput,
} from '@dfdao/snarks';
import whitelistCircuitPath from '@dfdao/snarks/whitelist.wasm?url';
import whitelistZkeyPath from '@dfdao/snarks/whitelist.zkey?url';
import { EthAddress } from '@dfdao/types';
import { EthAddress as PSEthAddress } from '@projectsophon/types';
import bigInt, { BigInteger } from 'big-integer';
import { TerminalHandle } from '../../Frontend/Views/Terminal';

/**
 * Helper method for generating whitelist SNARKS.
 * This is separate from the existing {@link SnarkArgsHelper}
 * because whitelist txs require far less setup compared
 * to SNARKS that are sent in context of the game.
 */
export const getWhitelistArgs = async (
  key: BigInteger,
  recipient: EthAddress | PSEthAddress,
  _terminal?: React.MutableRefObject<TerminalHandle | undefined>
): Promise<WhitelistSnarkContractCallArgs> => {
  try {
    const input: WhitelistSnarkInput = {
      key: key.toString(),
      recipient: bigInt(recipient.substring(2), 16).toString(),
    };

    const fullProveResponse = await window.snarkjs.groth16.fullProve(
      input,
      whitelistCircuitPath,
      whitelistZkeyPath
    );
    const { proof, publicSignals }: SnarkJSProofAndSignals = fullProveResponse;
    const ret = buildContractCallArgs(proof, publicSignals) as WhitelistSnarkContractCallArgs;

    return ret;
  } catch (e) {
    throw e;
  }
};
