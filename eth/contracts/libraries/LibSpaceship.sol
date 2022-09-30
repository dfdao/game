// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * Library for all things Spaceships
 */

// Contract imports
import "hardhat/console.sol";

// Library imports
import {LibUtils} from "./LibUtils.sol";

// Storage imports

// Type imports
import {Spaceship, SpaceshipInfo, SpaceshipType, TokenType} from "../DFTypes.sol";

library LibSpaceship {
    /**
     * @notice Create the token ID for a Spaceship with the following properties:
     * @param spaceship Spaceship
     */
    function encode(Spaceship memory spaceship) internal pure returns (uint256) {
        // x << y is equivalent to the mathematical expression x * 2**y
        uint256 tokenType = LibUtils.shiftLeft(
            uint8(spaceship.tokenType),
            uint8(SpaceshipInfo.TokenType)
        );
        uint256 shipType = LibUtils.shiftLeft(
            uint8(spaceship.spaceshipType),
            uint8(SpaceshipInfo.SpaceshipType)
        );
        return tokenType + shipType;
    }

    function decode(uint256 spaceshipId) internal pure returns (Spaceship memory) {
        bytes memory _b = abi.encodePacked(spaceshipId);
        // Idx is subtracted by one because each Info enum has Unknown at the zero location.
        uint8 tokenIdx = uint8(SpaceshipInfo.TokenType) - 1;
        uint8 shipInfoIdx = uint8(SpaceshipInfo.SpaceshipType) - 1;

        uint8 tokenType = uint8(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));
        uint8 shipType = uint8(LibUtils.calculateByteUInt(_b, shipInfoIdx, shipInfoIdx));

        return
            Spaceship({
                id: spaceshipId,
                tokenType: TokenType(tokenType),
                spaceshipType: SpaceshipType(shipType)
            });
    }

    function isShip(uint256 tokenId) internal pure returns (bool) {
        bytes memory _b = abi.encodePacked(tokenId);
        uint8 tokenIdx = uint8(SpaceshipInfo.TokenType) - 1;
        uint8 tokenType = uint8(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));
        return (TokenType(tokenType) == TokenType.Spaceship);
    }
}
