// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Contract imports
import {DFVerifierFacet} from "../facets/DFVerifierFacet.sol";
import {DFTokenFacet} from "../facets/DFTokenFacet.sol";

// Library imports
import {LibArtifact} from "./LibArtifact.sol";
import {LibArtifactUtils} from "./LibArtifactUtils.sol";
import {LibGameUtils} from "./LibGameUtils.sol";
import {LibLazyUpdate} from "./LibLazyUpdate.sol";
import {LibSpaceship} from "./LibSpaceship.sol";

// Storage imports
import {LibStorage, GameStorage, GameConstants, SnarkConstants} from "./LibStorage.sol";

// Type imports
import {ArtifactType, Artifact, DFPInitPlanetArgs, Planet, PlanetEventMetadata, PlanetType, RevealedCoords, SpaceType, Spaceship, SpaceshipType, Upgrade, UpgradeBranch} from "../DFTypes.sol";

library LibPlanet {
    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    function snarkConstants() internal pure returns (SnarkConstants storage sc) {
        return LibStorage.snarkConstants();
    }

    function gameConstants() internal pure returns (GameConstants storage) {
        return LibStorage.gameConstants();
    }

    // also need to copy some of DFCore's event signatures
    event PlanetUpgraded(address player, uint256 loc, uint256 branch, uint256 toBranchLevel);

    function revealLocation(
        uint256 location,
        uint256 perlin,
        uint256 x,
        uint256 y,
        bool checkTimestamp
    ) public {
        if (checkTimestamp) {
            require(
                block.timestamp - gs().players[msg.sender].lastRevealTimestamp >
                    gameConstants().LOCATION_REVEAL_COOLDOWN,
                "wait for cooldown before revealing again"
            );
        }
        require(gs().revealedCoords[location].locationId == 0, "Location already revealed");
        gs().revealedPlanetIds.push(location);
        gs().revealedCoords[location] = RevealedCoords({
            locationId: location,
            x: x,
            y: y,
            revealer: msg.sender
        });
        gs().players[msg.sender].lastRevealTimestamp = block.timestamp;
    }

    function getDefaultInitPlanetArgs(
        uint256 _location,
        uint256 _perlin,
        bool _isHomePlanet
    ) public view returns (DFPInitPlanetArgs memory) {
        (uint256 level, PlanetType planetType, SpaceType spaceType) = LibGameUtils
            ._getPlanetLevelTypeAndSpaceType(_location, _perlin);

        if (_isHomePlanet) {
            require(level == 0, "Can only initialize on planet level 0");
            require(planetType == PlanetType.PLANET, "Can only initialize on regular planets");
        }

        return
            DFPInitPlanetArgs(
                _location,
                _perlin,
                level,
                gameConstants().TIME_FACTOR_HUNDREDTHS,
                spaceType,
                planetType,
                _isHomePlanet
            );
    }

    /**
     * Same SNARK args as `initializePlayer`. Adds a planet to the smart contract without setting an owner.
     */
    function initializePlanet(
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[8] memory _input,
        bool isHomePlanet
    ) public {
        if (!snarkConstants().DISABLE_ZK_CHECKS) {
            require(
                DFVerifierFacet(address(this)).verifyInitProof(_a, _b, _c, _input),
                "Failed init proof check"
            );
        }

        uint256 _location = _input[0];
        uint256 _perlin = _input[1];

        LibGameUtils.revertIfBadSnarkPerlinFlags(
            [_input[3], _input[4], _input[5], _input[6], _input[7]],
            false
        );

        // Initialize planet information
        initializePlanetWithDefaults(_location, _perlin, isHomePlanet);
    }

    function initializePlanetWithDefaults(
        uint256 _location,
        uint256 _perlin,
        bool _isHomePlanet
    ) public {
        require(LibGameUtils._locationIdValid(_location), "Not a valid planet location");

        DFPInitPlanetArgs memory initArgs = getDefaultInitPlanetArgs(
            _location,
            _perlin,
            _isHomePlanet
        );

        _initializePlanet(initArgs);
        gs().planetIds.push(_location);
        gs().initializedPlanetCountByLevel[initArgs.level] += 1;
    }

    function _initializePlanet(DFPInitPlanetArgs memory args) public {
        Planet storage _planet = gs().planets[args.location];
        // can't initialize a planet twice
        require(!_planet.isInitialized, "Planet is already initialized");

        // planet initialize should set the planet to default state, including having the owner be adress 0x0
        // then it's the responsibility for the mechanics to set the owner to the player

        Planet memory defaultPlanet = LibGameUtils._defaultPlanet(
            args.location,
            args.level,
            args.planetType,
            args.spaceType,
            args.TIME_FACTOR_HUNDREDTHS
        );
        _planet.locationId = args.location;
        _planet.owner = defaultPlanet.owner;
        _planet.isHomePlanet = defaultPlanet.isHomePlanet;
        _planet.range = defaultPlanet.range;
        _planet.speed = defaultPlanet.speed;
        _planet.defense = defaultPlanet.defense;
        _planet.population = defaultPlanet.population;
        _planet.populationCap = defaultPlanet.populationCap;
        _planet.populationGrowth = defaultPlanet.populationGrowth;
        _planet.silverCap = defaultPlanet.silverCap;
        _planet.silverGrowth = defaultPlanet.silverGrowth;
        _planet.silver = defaultPlanet.silver;
        _planet.planetLevel = defaultPlanet.planetLevel;
        _planet.planetType = defaultPlanet.planetType;

        _planet.artifacts = defaultPlanet.artifacts;
        _planet.spaceships = defaultPlanet.spaceships;
        _planet.activeArtifact = defaultPlanet.activeArtifact;
        _planet.wormholeTo = defaultPlanet.wormholeTo;
        _planet.artifactActivationTime = defaultPlanet.artifactActivationTime;

        _planet.isInitialized = true;
        _planet.perlin = args.perlin;
        _planet.spaceType = args.spaceType;
        _planet.createdAt = block.timestamp;
        _planet.lastUpdated = block.timestamp;
        _planet.upgradeState0 = 0;
        _planet.upgradeState1 = 0;
        _planet.upgradeState2 = 0;

        _planet.pausers = 0;
        _planet.energyGroDoublers = 0;
        _planet.silverGroDoublers = 0;

        if (args.isHomePlanet) {
            _planet.isHomePlanet = true;
            _planet.owner = msg.sender;
            _planet.population = 50000;
        } else {
            _planet.spaceJunk = LibGameUtils.getPlanetDefaultSpaceJunk(_planet);

            if (LibGameUtils.isHalfSpaceJunk(args.location)) {
                _planet.spaceJunk /= 2;
            }
        }
    }

    function upgradePlanet(uint256 _location, uint256 _branch) public {
        Planet storage planet = gs().planets[_location];
        require(
            planet.owner == msg.sender,
            "Only owner account can perform that operation on planet."
        );
        uint256 planetLevel = planet.planetLevel;
        require(planetLevel > 0, "Planet level is not high enough for this upgrade");
        require(_branch < 3, "Upgrade branch not valid");
        require(planet.planetType == PlanetType.PLANET, "Can only upgrade regular planets");
        require(!planet.destroyed, "planet is destroyed");

        uint256 totalLevel = planet.upgradeState0 + planet.upgradeState1 + planet.upgradeState2;
        require(
            (planet.spaceType == SpaceType.NEBULA && totalLevel < 3) ||
                (planet.spaceType == SpaceType.SPACE && totalLevel < 4) ||
                (planet.spaceType == SpaceType.DEEP_SPACE && totalLevel < 5) ||
                (planet.spaceType == SpaceType.DEAD_SPACE && totalLevel < 5),
            "Planet at max total level"
        );

        uint256 upgradeBranchCurrentLevel;
        if (_branch == uint256(UpgradeBranch.DEFENSE)) {
            upgradeBranchCurrentLevel = planet.upgradeState0;
        } else if (_branch == uint256(UpgradeBranch.RANGE)) {
            upgradeBranchCurrentLevel = planet.upgradeState1;
        } else if (_branch == uint256(UpgradeBranch.SPEED)) {
            upgradeBranchCurrentLevel = planet.upgradeState2;
        }
        require(upgradeBranchCurrentLevel < 4, "Upgrade branch already maxed");

        Upgrade memory upgrade = LibStorage.upgrades()[_branch][upgradeBranchCurrentLevel];
        uint256 upgradeCost = (planet.silverCap * 20 * (totalLevel + 1)) / 100;
        require(planet.silver >= upgradeCost, "Insufficient silver to upgrade");

        // do upgrade
        LibGameUtils._buffPlanet(_location, upgrade);
        planet.silver -= upgradeCost;
        if (_branch == uint256(UpgradeBranch.DEFENSE)) {
            planet.upgradeState0 += 1;
        } else if (_branch == uint256(UpgradeBranch.RANGE)) {
            planet.upgradeState1 += 1;
        } else if (_branch == uint256(UpgradeBranch.SPEED)) {
            planet.upgradeState2 += 1;
        }
        emit PlanetUpgraded(msg.sender, _location, _branch, upgradeBranchCurrentLevel + 1);
    }

    function checkPlayerInit(
        uint256 _location,
        uint256 _perlin,
        uint256 _radius
    ) public view returns (bool) {
        require(!gs().players[msg.sender].isInitialized, "Player is already initialized");
        require(_radius <= gs().worldRadius, "Init radius is bigger than the current world radius");

        if (gameConstants().SPAWN_RIM_AREA != 0) {
            require(
                (_radius**2 * 314) / 100 + gameConstants().SPAWN_RIM_AREA >=
                    (gs().worldRadius**2 * 314) / 100,
                "Player can only spawn at the universe rim"
            );
        }

        require(
            _perlin >= gameConstants().INIT_PERLIN_MIN,
            "Init not allowed in perlin value less than INIT_PERLIN_MIN"
        );
        require(
            _perlin < gameConstants().INIT_PERLIN_MAX,
            "Init not allowed in perlin value greater than or equal to the INIT_PERLIN_MAX"
        );
        return true;
    }

    function getRefreshedPlanet(uint256 location, uint256 timestamp)
        public
        view
        returns (
            Planet memory,
            uint256[12] memory eventsToRemove,
            uint256[12] memory artifactsToAdd
        )
    {
        Planet memory planet = gs().planets[location];

        // first 12 are event ids to remove
        // last 12 are artifact ids that are new on the planet
        uint256[24] memory updates;

        PlanetEventMetadata[] memory events = gs().planetEvents[location];

        (planet, updates) = LibLazyUpdate.applyPendingEvents(timestamp, planet, events);

        for (uint256 i = 0; i < 12; i++) {
            eventsToRemove[i] = updates[i];
            artifactsToAdd[i] = updates[i + 12];
        }

        for (uint256 i = 0; i < artifactsToAdd.length; i++) {
            // Only apply Spaceship arrival if ship is a spaceship.
            if (LibSpaceship.isShip(artifactsToAdd[i])) {
                Spaceship memory spaceship = LibSpaceship.decode(artifactsToAdd[i]);
                planet = applySpaceshipArrive(spaceship, planet);
            }
        }

        planet = LibLazyUpdate.updatePlanet(timestamp, planet);

        return (planet, eventsToRemove, artifactsToAdd);
    }

    function applySpaceshipArrive(Spaceship memory spaceship, Planet memory planet)
        public
        pure
        returns (Planet memory)
    {
        if (planet.isHomePlanet) {
            return planet;
        }

        if (spaceship.spaceshipType == SpaceshipType.ShipMothership) {
            if (planet.energyGroDoublers == 0) {
                planet.populationGrowth *= 2;
            }
            planet.energyGroDoublers++;
        } else if (spaceship.spaceshipType == SpaceshipType.ShipWhale) {
            if (planet.silverGroDoublers == 0) {
                planet.silverGrowth *= 2;
            }
            planet.silverGroDoublers++;
        } else if (spaceship.spaceshipType == SpaceshipType.ShipTitan) {
            planet.pausers++;
        }

        return planet;
    }

    function refreshPlanet(uint256 location) public {
        require(gs().planets[location].isInitialized, "Planet has not been initialized");

        (
            Planet memory planet,
            uint256[12] memory eventsToRemove,
            uint256[12] memory tokenIdsToAddToPlanet
        ) = getRefreshedPlanet(location, block.timestamp);

        gs().planets[location] = planet;

        PlanetEventMetadata[] storage events = gs().planetEvents[location];

        for (uint256 toRemoveIdx = 0; toRemoveIdx < 12; toRemoveIdx++) {
            for (uint256 i = 0; i < events.length; i++) {
                if (events[i].id == eventsToRemove[toRemoveIdx]) {
                    events[i] = events[events.length - 1];
                    events.pop();
                }
            }
        }

        for (uint256 i = 0; i < 12; i++) {
            if (tokenIdsToAddToPlanet[i] != 0) {
                if (LibSpaceship.isShip(tokenIdsToAddToPlanet[i])) {
                    LibSpaceship.putSpaceshipOnPlanet(location, tokenIdsToAddToPlanet[i]);
                } else if (LibArtifact.isArtifact(tokenIdsToAddToPlanet[i])) {
                    LibArtifact.putArtifactOnPlanet(location, tokenIdsToAddToPlanet[i]);
                }
            }
        }
    }

    function withdrawSilver(uint256 locationId, uint256 silverToWithdraw) public {
        Planet storage planet = gs().planets[locationId];
        require(planet.owner == msg.sender, "you must own this planet");
        require(
            planet.planetType == PlanetType.TRADING_POST,
            "can only withdraw silver from trading posts"
        );
        require(!planet.destroyed, "planet is destroyed");
        require(
            planet.silver >= silverToWithdraw,
            "tried to withdraw more silver than exists on planet"
        );

        planet.silver -= silverToWithdraw;

        // Energy and Silver are not stored as floats in the smart contracts,
        // so any of those values coming from the contracts need to be divided by
        // `CONTRACT_PRECISION` to get their true integer value.
        uint256 scoreGained = silverToWithdraw / 1000;
        scoreGained = (scoreGained * gameConstants().SILVER_SCORE_VALUE) / 100;
        gs().players[msg.sender].score += scoreGained;
    }
}
