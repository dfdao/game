// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Library imports
import {LibGameUtils} from "../libraries/LibGameUtils.sol";
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibPlanet} from "../libraries/LibPlanet.sol";

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";

// Type imports
import {AdminCreateRevealPlanetArgs, DFPInitPlanetArgs, SpaceType} from "../DFTypes.sol";
import "hardhat/console.sol";

contract DFArenaFacet is WithStorage {
    event AdminPlanetCreated(uint256 loc);

    function createArenaPlanet(AdminCreateRevealPlanetArgs memory args) public {
        require(gameConstants().ADMIN_CAN_ADD_PLANETS, "admin can no longer add planets");
        // TODO: check init planet hash
        require(msg.sender == LibPermissions.contractOwner(), "must be admin");

        if (args.requireValidLocationId) {
            require(LibGameUtils._locationIdValid(args.location), "Not a valid planet location");
        }

        if (args.isTargetPlanet) {
            require(
                gameConstants().TARGETS_REQUIRED_FOR_VICTORY > 0,
                "admin cannot create target planets"
            );
            gs().targetPlanetIds.push(args.location);
        }
        if (args.isSpawnPlanet) {
            require(gameConstants().MANUAL_SPAWN, "admin cannot create spawn planets");
            gs().spawnPlanetIds.push(args.location);
        }

        SpaceType spaceType = LibGameUtils.spaceTypeFromPerlin(args.perlin);
        LibPlanet._initializePlanet(
            DFPInitPlanetArgs({
                location: args.location,
                perlin: args.perlin,
                level: args.level,
                TIME_FACTOR_HUNDREDTHS: gameConstants().TIME_FACTOR_HUNDREDTHS,
                spaceType: spaceType,
                planetType: args.planetType,
                isHomePlanet: false,
                isSpawnPlanet: args.isSpawnPlanet,
                isTargetPlanet: args.isTargetPlanet
            })
        );

        gs().planetIds.push(args.location);
        gs().initializedPlanetCountByLevel[args.level] += 1;

        emit AdminPlanetCreated(args.location);
    }

    /**
     * Getters
     */
    function getNTargetPlanets() public view returns (uint256) {
        return gs().targetPlanetIds.length;
    }

    function getNSpawnPlanets() public view returns (uint256) {
        return gs().spawnPlanetIds.length;
    }

    function targetPlanetIds(uint256 idx) public view returns (uint256) {
        return gs().targetPlanetIds[idx];
    }

    function spawnPlanetIds(uint256 idx) public view returns (uint256) {
        return gs().spawnPlanetIds[idx];
    }
}
