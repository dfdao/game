// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Contract imports
import {DFWhitelistFacet} from "../facets/DFWhitelistFacet.sol";

// Library imports
import {LibGameUtils} from "../libraries/LibGameUtils.sol";
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibPlanet} from "../libraries/LibPlanet.sol";

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";

// Type imports
import {AdminCreateRevealPlanetArgs, DFPInitPlanetArgs, Planet, SpaceType} from "../DFTypes.sol";
import "hardhat/console.sol";

contract DFArenaFacet is WithStorage {
    event AdminPlanetCreated(uint256 loc);
    event Gameover(address[] winners);
    event LocationRevealed(address revealer, uint256 loc, uint256 x, uint256 y);

    modifier onlyWhitelisted() {
        require(
            DFWhitelistFacet(address(this)).isWhitelisted(msg.sender) ||
                msg.sender == LibPermissions.contractOwner(),
            "Player is not whitelisted"
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == LibPermissions.contractOwner(),
            "Only Admin address can perform this action."
        );
        _;
    }

    modifier notPaused() {
        require(!gs().paused, "Game is paused");
        _;
    }

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

    function arenaRevealLocation(AdminCreateRevealPlanetArgs memory args)
        public
        onlyWhitelisted
        returns (uint256)
    {
        if (!gs().planets[args.location].isInitialized) {
            LibPlanet.initializePlanetWithDefaults(args.location, args.perlin, false);
        }

        LibPlanet.revealLocation({
            location: args.location,
            perlin: args.perlin,
            x: args.x,
            y: args.y,
            /* if this is true, check timestamp for reveal. We want false for admin / init planets */
            checkTimestamp: !(msg.sender == LibPermissions.contractOwner()) // || isInitPlanet(args))
        });
        emit LocationRevealed(msg.sender, args.location, args.x, args.y);
    }

    function bulkCreatePlanet(AdminCreateRevealPlanetArgs[] memory planets) public onlyAdmin {
        for (uint256 i = 0; i < planets.length; i++) {
            createArenaPlanet(planets[i]);
        }
    }

    /* should be only admin or init planet*/
    function createAndReveal(AdminCreateRevealPlanetArgs memory createPlanetArgs) public {
        createArenaPlanet(createPlanetArgs);
        arenaRevealLocation(createPlanetArgs);
    }

    function bulkCreateAndReveal(AdminCreateRevealPlanetArgs[] calldata createArgsList) public {
        for (uint256 i = 0; i < createArgsList.length; i++) {
            createAndReveal(createArgsList[i]);
        }
    }

    function _checkGameOver() public returns (bool) {
        require(gameConstants().TARGETS_REQUIRED_FOR_VICTORY > 0, "target planets are disabled");

        uint256[] memory targetPlanets = gs().targetPlanetIds;
        uint256 captured = 0;

        for (uint256 i = 0; i < targetPlanets.length; i++) {
            uint256 locationId = targetPlanets[i];
            LibPlanet.refreshPlanet(locationId);
            Planet memory planet = gs().planets[locationId];

            bool myPlanet = planet.owner == msg.sender;

            // if (gameConstants().TEAMS_ENABLED) {
            //     myPlanet =
            //         arenaStorage().arenaPlayerInfo[planet.owner].team ==
            //         arenaStorage().arenaPlayerInfo[msg.sender].team;
            // }

            uint256 playerHomePlanet = gs().players[msg.sender].homePlanetId;
            // bool blocked = gs().blocklist[locationId][playerHomePlanet];
            // Blocklist and teams are not in right now
            if (
                !myPlanet ||
                (planet.population * 100) / planet.populationCap <
                gameConstants().CLAIM_VICTORY_ENERGY_PERCENT
            ) {
                continue;
            }

            captured += 1;
            if (captured >= gameConstants().TARGETS_REQUIRED_FOR_VICTORY) return true;
        }

        return false;
    }

    function claimVictory() public onlyWhitelisted notPaused {
        require(!gs().gameOver, "cannot claim victory when game is over");

        require(_checkGameOver(), "victory condition not met");

        gs().winners.push(msg.sender);
        gs().gameOver = true;
        gs().endTime = block.timestamp;
        gs().paused = true;
        emit Gameover(gs().winners);
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

    function getRoundDuration() public view returns (uint256) {
        if (gs().startTime == 0) {
            return 0;
        }
        if (gs().endTime == 0) {
            return block.timestamp - gs().startTime;
        }
        return gs().endTime - gs().startTime;
    }
}
