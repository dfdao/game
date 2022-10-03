// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * Library for all things Spaceships
 */

// Library imports
import {LibUtils} from "./LibUtils.sol";

// Storage imports
import {LibStorage, GameStorage, GameConstants, SnarkConstants} from "./LibStorage.sol";

// Type imports
import {Spaceship, SpaceshipInfo, SpaceshipType, TokenType} from "../DFTypes.sol";

library LibSpaceship {
    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    /**
     * @notice Create the token ID for a Spaceship with the following properties:
     * @param spaceshipType SpaceshipType.
     */
    function create(SpaceshipType spaceshipType) internal pure returns (uint256) {
        require(isValidShipType(spaceshipType), "spaceship type is not valid");

        uint256 tokenType = LibUtils.shiftLeft(
            uint8(TokenType.Spaceship),
            uint8(SpaceshipInfo.TokenType)
        );
        uint256 shipType = LibUtils.shiftLeft(
            uint8(spaceshipType),
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

        require(isShip(spaceshipId), "token type is not spaceship");
        require(isValidShipType(SpaceshipType(shipType)), "spaceship type is not valid");

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
        return (tokenType == uint8(TokenType.Spaceship));
    }

    function isValidShipType(SpaceshipType shipType) internal pure returns (bool) {
        return (shipType >= SpaceshipType.ShipMothership && shipType <= SpaceshipType.ShipTitan);
    }

    function isSpaceshipOnPlanet(uint256 locationId, uint256 shipId) internal view returns (bool) {
        for (uint256 i; i < gs().planets[locationId].spaceships.length; i++) {
            if (gs().planets[locationId].spaceships[i] == shipId) {
                return true;
            }
        }
        return false;
    }

    function putSpaceshipOnPlanet(uint256 locationId, uint256 spaceshipId) internal {
        gs().planets[locationId].spaceships.push(spaceshipId);
    }

    function takeSpaceshipOffPlanet(uint256 locationId, uint256 spaceshipId) internal {
        uint256 shipsOnThisPlanet = gs().planets[locationId].spaceships.length;

        bool hadTheShip = false;

        for (uint256 i = 0; i < shipsOnThisPlanet; i++) {
            if (gs().planets[locationId].spaceships[i] == spaceshipId) {
                gs().planets[locationId].spaceships[i] = gs().planets[locationId].spaceships[
                    shipsOnThisPlanet - 1
                ];

                hadTheShip = true;
                break;
            }
        }

        require(hadTheShip, "this ship was not present on this planet");
        gs().planets[locationId].spaceships.pop();
    }
}
