// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

// Note: We can call _mint and _setTokenUri directly in DFArtifactFacet, but I like having a wrapper
// This makes it more obvious when we are using the DFToken functions

contract DFToken is SolidStateERC1155 {
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public {
        _mint(account, id, amount, data);
    }

    /**
     * @notice set per-token metadata URI
     * @param tokenId token whose metadata URI to set
     * @param tokenURI per-token URI
     */
    function setTokenURI(uint256 tokenId, string memory tokenURI) public {
        _setTokenURI(tokenId, tokenURI);
    }
}
