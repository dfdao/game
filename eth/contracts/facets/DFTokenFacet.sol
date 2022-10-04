// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Contract imports
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

// Library Imports
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibSpaceship} from "../libraries/LibSpaceship.sol";

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";

import "hardhat/console.sol";

contract DFTokenFacet is WithStorage, SolidStateERC1155 {
    modifier onlyAdminOrCore() {
        require(
            msg.sender == gs().diamondAddress || msg.sender == LibPermissions.contractOwner(),
            "Only the Core or Admin addresses can fiddle with tokens."
        );
        _;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        uint256 length = ids.length;
        for (uint256 i = 0; i < length; i++) {
            // Only core contract can transfer Spaceships
            if (LibSpaceship.isShip(ids[i])) {
                require(msg.sender == gs().diamondAddress, "player cannot transfer a Spaceship");
            }
        }

        // TODO: Are we supposed to call this before or after
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /**
     * @notice set per-token metadata URI
     * @param tokenId token whose metadata URI to set
     * @param tokenURI per-token URI
     */
    function setTokenURI(uint256 tokenId, string memory tokenURI) public {
        _setTokenURI(tokenId, tokenURI);
    }

    /**
     * @notice ERC1155 mint
     * @param owner of new tokens
     * @param tokenId tokenId to mint
     * @param amount amount of tokens to mint
     */
    function mint(
        address owner,
        uint256 tokenId,
        uint256 amount
    ) public onlyAdminOrCore {
        _mint(owner, tokenId, amount, "");
    }

    /**
     * @notice burn given quantity of tokens held by given address
     * @param account holder of tokens to burn
     * @param id token ID
     * @param amount quantity of tokens to burn
     */
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyAdminOrCore {
        _burn(account, id, amount);
    }

    /**
     * @notice transfer tokens between given addresses
     * @dev ERC1155Receiver implementation is not checked
     * @param operator executor of transfer
     * @param sender sender of tokens
     * @param recipient receiver of tokens
     * @param id token ID
     * @param amount quantity of tokens to transfer
     * @param data data payload
     */
    function transfer(
        address operator,
        address sender,
        address recipient,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyAdminOrCore {
        _transfer(operator, sender, recipient, id, amount, data);
    }

    function tokenExists(address owner, uint256 tokenId) public view returns (bool) {
        return balanceOf(owner, tokenId) > 0;
    }
}
