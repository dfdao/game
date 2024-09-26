// SPDX-License-Identifier: GPL-3.0 AND MIT
/**
 * Customized version of DiamondInit.sol
 *
 * Vendored on November 16, 2021 from:
 * https://github.com/mudgen/diamond-3-hardhat/blob/7feb995/contracts/upgradeInitializers/DiamondInit.sol
 */
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

// It is expected that this contract is customized in order to deploy a diamond with data
// from a deployment script. The init function is used to initialize state variables
// of the diamond. Add parameters to the init function if you need to.

// Interface imports

// Inherited storage
import {ERC1155MetadataStorage} from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataStorage.sol";

// Library imports
import {WithStorage} from "./libraries/LibStorage.sol";

// Type imports
import {AuxiliaryArgs, InitArgs} from "./DFTypes.sol";

contract DFInitialize is WithStorage {
    using ERC1155MetadataStorage for ERC1155MetadataStorage.Layout;

    // You can add parameters to this function in order to pass in
    // data to set initialize state variables
    function init(InitArgs calldata initArgs, AuxiliaryArgs calldata auxArgs) external {
        // Setup the ERC1155 metadata
        ERC1155MetadataStorage.layout().baseURI = auxArgs.baseURI;

        gs().diamondAddress = address(this);

        /* Store initializers */
        initializers().initArgs = initArgs;
        initializers().auxArgs = auxArgs;
    }
}
