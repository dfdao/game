// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// External contract imports
import {DFArtifactFacet} from "./DFArtifactFacet.sol";

// Library imports
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibSpaceship} from "../libraries/LibSpaceship.sol";

// Storage imports
import {WithStorage, SnarkConstants, GameConstants} from "../libraries/LibStorage.sol";

// Type imports
import {Spaceship, SpaceshipType} from "../DFTypes.sol";

contract DFSpaceshipFacet is WithStorage {
    modifier onlyAdminOrCore() {
        require(
            msg.sender == gs().diamondAddress || msg.sender == LibPermissions.contractOwner(),
            "Only the Core or Admin addresses can fiddle with artifacts."
        );
        _;
    }

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
        uint256[] memory tokens = DFArtifactFacet(address(this)).tokensByAccount(player);
        uint256 numSpaceships = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (LibSpaceship.isShip(tokens[i])) numSpaceships += 1;
        }
        ret = new Spaceship[](numSpaceships);
        for (uint256 i = 0; i < tokens.length; i++) {
            if (LibSpaceship.isShip(tokens[i])) ret[i] = LibSpaceship.decode(tokens[i]);
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

    function createSpaceship(uint256 tokenId, address owner)
        public
        onlyAdminOrCore
        returns (Spaceship memory)
    {
        require(tokenId >= 1, "token id must be positive");
        require(LibSpaceship.isShip(tokenId), "token must be Spaceship");

        // Account, Id, Amount, Data
        DFArtifactFacet(address(this)).mint(owner, tokenId, 1, "");

        return getSpaceshipFromId(tokenId);
    }
}
