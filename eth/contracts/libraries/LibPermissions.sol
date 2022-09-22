// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {OwnableStorage} from "@solidstate/contracts/access/ownable/OwnableStorage.sol";

library LibPermissions {
    using OwnableStorage for OwnableStorage.Layout;

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = OwnableStorage.layout().owner;
    }

    function enforceIsContractOwner() internal view {
        require(msg.sender == OwnableStorage.layout().owner, "LibDiamond: Must be contract owner");
    }
}
