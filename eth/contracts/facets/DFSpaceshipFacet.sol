// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// External contract imports
import {DFWhitelistFacet} from "./DFWhitelistFacet.sol";
import {DFTokenFacet} from "./DFTokenFacet.sol";

// Library imports
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibSpaceship} from "../libraries/LibSpaceship.sol";

// Storage imports
import {WithStorage, SnarkConstants, GameConstants} from "../libraries/LibStorage.sol";

// Type imports
import {Spaceship, SpaceshipType} from "../DFTypes.sol";

contract DFSpaceshipFacet is WithStorage {
    /**
     * Modifiers
     */
    modifier onlyAdminOrCore() {
        require(
            msg.sender == gs().diamondAddress || msg.sender == LibPermissions.contractOwner(),
            "Only the Core or Admin addresses can fiddle with artifacts."
        );
        _;
    }

    modifier onlyWhitelisted() {
        require(
            DFWhitelistFacet(address(this)).isWhitelisted(msg.sender) ||
                msg.sender == LibPermissions.contractOwner(),
            "Player is not whitelisted"
        );
        _;
    }
    /**
     * Events
     */
    event ArtifactFound(address player, uint256 artifactId, uint256 loc);

    /**
     * Getters
     */
    function planetSpaceships(uint256 locationId) public view returns (uint256[] memory) {
        return gs().planets[locationId].spaceships;
    }

    function getSpaceshipsOnPlanet(uint256 locationId)
        public
        view
        returns (Spaceship[] memory ret)
    {
        uint256[] memory tokenIds = gs().planets[locationId].spaceships;
        ret = new Spaceship[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            ret[i] = LibSpaceship.decode(tokenIds[i]);
        }
        return ret;
    }

    function bulkGetPlanetSpaceships(uint256[] calldata planetIds)
        public
        view
        returns (Spaceship[][] memory)
    {
        Spaceship[][] memory ret = new Spaceship[][](planetIds.length);

        for (uint256 i = 0; i < planetIds.length; i++) {
            uint256[] memory spacehipsOnPlanet = gs().planets[planetIds[i]].spaceships;
            ret[i] = bulkGetSpaceshipsByIds(spacehipsOnPlanet);
        }

        return ret;
    }

    function bulkGetSpaceshipsByIds(uint256[] memory spaceshpIds)
        public
        pure
        returns (Spaceship[] memory ret)
    {
        ret = new Spaceship[](spaceshpIds.length);

        for (uint256 i = 0; i < spaceshpIds.length; i++) {
            ret[i] = LibSpaceship.decode(spaceshpIds[i]);
        }
    }

    function getPlayerSpaceships(address player) public view returns (Spaceship[] memory ret) {
        uint256[] memory tokens = DFTokenFacet(address(this)).tokensByAccount(player);
        uint256 numSpaceships = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (LibSpaceship.isShip(tokens[i])) numSpaceships += 1;
        }
        ret = new Spaceship[](numSpaceships);
        numSpaceships = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (LibSpaceship.isShip(tokens[i]))
                ret[numSpaceships++] = LibSpaceship.decode(tokens[i]);
        }
    }

    function getSpaceshipFromId(uint256 shipId) public pure returns (Spaceship memory) {
        return LibSpaceship.decode(shipId);
    }

    /**
     * Helpers
     */

    function createSpaceshipId(SpaceshipType spaceshipType) public pure returns (uint256) {
        return LibSpaceship.create(spaceshipType);
    }

    /**
     * Actions
     */

    /**
      Gives players 5 spaceships on their home planet. Can only be called once
      by a given player. This is a first pass at getting spaceships into the game.
      Eventually ships will be able to spawn in the game naturally (construction, capturing, etc.)
     */

    function giveSpaceShips(uint256 locationId) public onlyWhitelisted {
        require(!gs().players[msg.sender].claimedShips, "player already claimed ships");
        require(
            gs().planets[locationId].owner == msg.sender && gs().planets[locationId].isHomePlanet,
            "you can only spawn ships on your home planet"
        );

        address owner = gs().planets[locationId].owner;
        if (gameConstants().SPACESHIPS.MOTHERSHIP) {
            uint256 id1 = LibSpaceship.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipMothership
            );
            emit ArtifactFound(msg.sender, id1, locationId);
        }

        if (gameConstants().SPACESHIPS.CRESCENT) {
            uint256 id2 = LibSpaceship.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipCrescent
            );
            emit ArtifactFound(msg.sender, id2, locationId);
        }

        if (gameConstants().SPACESHIPS.WHALE) {
            uint256 id3 = LibSpaceship.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipWhale
            );
            emit ArtifactFound(msg.sender, id3, locationId);
        }

        if (gameConstants().SPACESHIPS.GEAR) {
            uint256 id4 = LibSpaceship.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipGear
            );
            emit ArtifactFound(msg.sender, id4, locationId);
        }

        if (gameConstants().SPACESHIPS.TITAN) {
            uint256 id5 = LibSpaceship.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipTitan
            );

            emit ArtifactFound(msg.sender, id5, locationId);
        }

        gs().players[msg.sender].claimedShips = true;
    }
}
