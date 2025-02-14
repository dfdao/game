// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Library imports
import {LibArtifact} from "../libraries/LibArtifact.sol";
import {LibArtifactUtils} from "../libraries/LibArtifactUtils.sol";
import {LibGameUtils} from "../libraries/LibGameUtils.sol";
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibPlanet} from "../libraries/LibPlanet.sol";
import {LibSpaceship} from "../libraries/LibSpaceship.sol";

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";

// Contract imports
import {DFArtifactFacet} from "./DFArtifactFacet.sol";
import {DFSpaceshipFacet} from "./DFSpaceshipFacet.sol";

// Type imports
import {Artifact, SpaceType, Spaceship, SpaceshipType, DFPInitPlanetArgs, AdminCreatePlanetArgs, DFTCreateArtifactArgs, ArtifactType, Player, Planet, TokenType} from "../DFTypes.sol";

contract DFAdminFacet is WithStorage {
    event AdminOwnershipChanged(uint256 loc, address newOwner);
    event AdminPlanetCreated(uint256 loc);
    event AdminGiveSpaceship(uint256 loc, address owner, SpaceshipType shipType);
    event PauseStateChanged(bool paused);
    event AdminArtifactCreated(address player, uint256 artifactId, uint256 loc);

    /////////////////////////////
    /// Administrative Engine ///
    /////////////////////////////

    modifier onlyAdmin() {
        LibPermissions.enforceIsContractOwner();
        _;
    }

    function pause() public onlyAdmin {
        require(!gs().paused, "Game is already paused");
        gs().paused = true;
        emit PauseStateChanged(true);
    }

    function unpause() public onlyAdmin {
        require(gs().paused, "Game is already unpaused");
        gs().paused = false;
        emit PauseStateChanged(false);
    }

    /**
     * Only works for initialized planets.
     */
    function setOwner(uint256 planetId, address newOwner) public onlyAdmin {
        gs().planets[planetId].owner = newOwner;
        emit AdminOwnershipChanged(planetId, newOwner);
    }

    function deductScore(address playerAddress, uint256 amount) public onlyAdmin {
        Player storage player = gs().players[playerAddress];

        require(player.isInitialized, "player does not exist");
        require(amount <= player.score, "tried to deduct much score");

        player.score -= amount;
    }

    function addScore(address playerAddress, uint256 amount) public onlyAdmin {
        Player storage player = gs().players[playerAddress];

        require(player.isInitialized, "player does not exist");

        player.score += amount;
    }

    /**
     * Sets the owner of the given planet, even if it's not initialized (which is why
     * it requires the same snark arguments as DFCoreFacet#initializePlanet).
     */
    function safeSetOwner(
        address newOwner,
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[8] memory _input
    ) public onlyAdmin {
        uint256 planetId = _input[0];

        if (!gs().planets[planetId].isInitialized) {
            LibPlanet.initializePlanet(_a, _b, _c, _input, false);
        }

        gs().planets[planetId].silver = gs().planets[planetId].silverCap;
        gs().planets[planetId].population = gs().planets[planetId].populationCap;

        setOwner(planetId, newOwner);
    }

    function changeWorldRadiusMin(uint256 _newConstant) public onlyAdmin {
        gameConstants().WORLD_RADIUS_MIN = _newConstant;
        LibGameUtils.updateWorldRadius();
    }

    function adminSetWorldRadius(uint256 _newRadius) public onlyAdmin {
        gs().worldRadius = _newRadius;
    }

    function changeLocationRevealCooldown(uint256 newCooldown) public onlyAdmin {
        gameConstants().LOCATION_REVEAL_COOLDOWN = newCooldown;
    }

    function withdraw() public onlyAdmin {
        // TODO: Don't send to msg.sender, instead send to contract admin
        payable(msg.sender).transfer(address(this).balance);
    }

    function setTokenMintEndTime(uint256 newTokenMintEndTime) public onlyAdmin {
        gs().TOKEN_MINT_END_TIMESTAMP = newTokenMintEndTime;
    }

    function createPlanet(AdminCreatePlanetArgs memory args) public onlyAdmin {
        require(gameConstants().ADMIN_CAN_ADD_PLANETS, "admin can no longer add planets");
        if (args.requireValidLocationId) {
            require(LibGameUtils._locationIdValid(args.location), "Not a valid planet location");
        }
        SpaceType spaceType = LibGameUtils.spaceTypeFromPerlin(args.perlin);
        LibPlanet._initializePlanet(
            DFPInitPlanetArgs(
                args.location,
                args.perlin,
                args.level,
                gameConstants().TIME_FACTOR_HUNDREDTHS,
                spaceType,
                args.planetType,
                false
            )
        );
        gs().planetIds.push(args.location);
        gs().initializedPlanetCountByLevel[args.level] += 1;

        emit AdminPlanetCreated(args.location);
    }

    function adminGiveSpaceShip(
        uint256 locationId,
        address owner,
        SpaceshipType shipType
    ) public onlyAdmin {
        require(gs().planets[locationId].isInitialized, "planet is not initialized");

        uint256 shipId = LibSpaceship.createAndPlaceSpaceship(locationId, owner, shipType);
        Spaceship memory spaceship = LibSpaceship.decode(shipId);
        Planet memory planet = gs().planets[locationId];

        planet = LibPlanet.applySpaceshipArrive(spaceship, planet);

        gs().planets[locationId] = planet;

        emit AdminGiveSpaceship(locationId, owner, shipType);
    }

    function adminInitializePlanet(uint256 locationId, uint256 perlin) public onlyAdmin {
        require(!gs().planets[locationId].isInitialized, "planet is already initialized");

        LibPlanet.initializePlanetWithDefaults(locationId, perlin, false);
    }

    function setPlanetTransferEnabled(bool enabled) public onlyAdmin {
        gameConstants().PLANET_TRANSFER_ENABLED = enabled;
    }

    function adminGiveArtifact(DFTCreateArtifactArgs memory args) public onlyAdmin {
        // Note: calling this in tests should supply Diamond address as args.owner
        uint256 tokenId = LibArtifact.create(args.rarity, args.artifactType, args.biome);

        Artifact memory artifact = DFArtifactFacet(address(this)).createArtifact(
            tokenId,
            args.owner
        );

        // Don't put artifact on planet if no planetId given.
        if (args.planetId != 0) LibArtifact.putArtifactOnPlanet(args.planetId, artifact.id);
        emit AdminArtifactCreated(args.owner, artifact.id, args.planetId);
    }
}
