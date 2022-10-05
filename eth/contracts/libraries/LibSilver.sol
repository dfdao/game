// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * Library for all things Silver
 */

// Library imports
import {LibUtils} from "./LibUtils.sol";

// Type imports
import {SilverInfo, TokenType} from "../DFTypes.sol";

library LibSilver {
    /**
     * @notice Create the token ID for Silver.
     * Takes no args because silver is a fungible resource.
     */
    function create() internal pure returns (uint256) {
        // x << y is equivalent to the mathematical expression x * 2**y
        uint256 tokenType = LibUtils.shiftLeft(
            uint8(TokenType.Silver),
            uint8(SilverInfo.TokenType)
        );
        return tokenType;
    }

    function decode(uint256 silverId) internal pure returns (uint256) {
        bytes memory _b = abi.encodePacked(silverId);
        // Idx is subtracted by one because each Info enum has Unknown at the zero location.
        uint8 tokenIdx = uint8(SilverInfo.TokenType) - 1;

        uint8 tokenType = uint8(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));

        require(tokenType == uint8(TokenType.Silver), "token is not silver");
        return silverId;
    }

    function isSilver(uint256 tokenId) internal pure returns (bool) {
        bytes memory _b = abi.encodePacked(tokenId);
        uint8 tokenIdx = uint8(SilverInfo.TokenType) - 1;
        uint8 tokenType = uint8(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));
        return (tokenType == uint8(TokenType.Silver));
    }
}
