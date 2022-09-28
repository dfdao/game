// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// External contract imports
import {DFArtifactFacet} from "../facets/DFArtifactFacet.sol";

// Library imports
import {LibGameUtils} from "./LibGameUtils.sol";

// Storage imports
import {LibStorage, GameStorage, GameConstants} from "./LibStorage.sol";

// Type imports
import {Biome, Planet, PlanetType, Artifact, ArtifactType, ArtifactRarity, CollectionType, DFPFindArtifactArgs, DFTCreateArtifactArgs, ArtifactProperties} from "../DFTypes.sol";
import "hardhat/console.sol";

library LibArtifactUtils {
    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    function gameConstants() internal pure returns (GameConstants storage) {
        return LibStorage.gameConstants();
    }

    // also need to copy some of DFCore's event signatures
    event ArtifactActivated(address player, uint256 artifactId, uint256 loc);
    event ArtifactDeactivated(address player, uint256 artifactId, uint256 loc);
    event PlanetUpgraded(address player, uint256 loc, uint256 branch, uint256 toBranchLevel);

    // verifies that user is allowed to call findArtifact on this planet
    function checkFindArtifact(uint256 locationId, Planet memory planet)
        public
        view
        returns (bool)
    {
        require(!planet.hasTriedFindingArtifact, "artifact already minted from this planet");
        require(planet.owner == msg.sender, "you can only find artifacts on planets you own");
        require(planet.prospectedBlockNumber != 0, "planet never prospected");
        require(
            planet.prospectedBlockNumber < block.number,
            "can only call findArtifact after prospectedBlockNumber"
        );
        require(block.number > planet.prospectedBlockNumber, "invalid prospectedBlockNumber");
        require(block.number - planet.prospectedBlockNumber < 256, "planet prospect expired");
        require(!planet.destroyed, "planet is destroyed");

        if (gameConstants().SPACESHIPS.GEAR) {
            require(containsGear(locationId), "gear ship must be present on planet");
        }

        return true;
    }

    /**
     * Create a new spaceship and place it on a planet owned by the given player. Returns the id
     * of the newly created spaceship.
     */
    function createAndPlaceSpaceship(
        uint256 planetId,
        address owner,
        ArtifactType shipType
    ) public returns (uint256) {
        require(shipType <= ArtifactType.ShipTitan && shipType >= ArtifactType.ShipMothership);

        uint256 id = uint256(keccak256(abi.encodePacked(planetId, gs().miscNonce++)));
        uint256 tokenId = DFArtifactFacet(address(this)).encodeArtifact(
            uint8(CollectionType.Spaceship),
            uint8(ArtifactRarity.Unknown),
            uint8(shipType),
            uint8(Biome.Unknown)
        );
        DFTCreateArtifactArgs memory createArtifactArgs = DFTCreateArtifactArgs(
            tokenId,
            msg.sender,
            planetId,
            ArtifactRarity.Unknown,
            Biome.Unknown,
            shipType,
            address(this),
            owner
        );

        Artifact memory foundArtifact = DFArtifactFacet(address(this)).createArtifact(
            createArtifactArgs
        );
        LibGameUtils._putArtifactOnPlanet(planetId, foundArtifact.id);

        return id;
    }

    function findArtifact(DFPFindArtifactArgs memory args) public returns (uint256 artifactId) {
        Planet storage planet = gs().planets[args.planetId];

        require(checkFindArtifact(args.planetId, planet));

        Biome biome = LibGameUtils._getBiome(planet.spaceType, args.biomebase);

        uint256 artifactSeed = uint256(
            keccak256(
                abi.encodePacked(
                    args.planetId,
                    args.coreAddress,
                    blockhash(planet.prospectedBlockNumber)
                )
            )
        );

        (ArtifactType artifactType, uint256 levelBonus) = LibGameUtils
            ._randomArtifactTypeAndLevelBonus(artifactSeed, biome, planet.spaceType);

        ArtifactRarity rarity = LibGameUtils.artifactRarityFromPlanetLevel(
            levelBonus + planet.planetLevel
        );

        // console.log("LAU: collectionType %s", uint8(CollectionType.Artifact));
        // console.log("LAU: rarity %s", uint8(rarity));
        // console.log("artifactType %s", uint8(artifactType));
        // console.log("biome %s", uint8(biome));

        uint256 tokenId = DFArtifactFacet(address(this)).encodeArtifact(
            uint8(CollectionType.Artifact),
            uint8(rarity),
            uint8(artifactType),
            uint8(biome)
        );

        DFTCreateArtifactArgs memory createArtifactArgs = DFTCreateArtifactArgs(
            tokenId,
            msg.sender, // discoverer
            args.planetId,
            rarity,
            biome,
            artifactType,
            args.coreAddress, // owner
            address(0)
        );

        Artifact memory foundArtifact = DFArtifactFacet(address(this)).createArtifact(
            createArtifactArgs
        );

        LibGameUtils._putArtifactOnPlanet(args.planetId, foundArtifact.id);

        planet.hasTriedFindingArtifact = true;
        gs().players[msg.sender].score += gameConstants().ARTIFACT_POINT_VALUES[
            uint256(foundArtifact.rarity)
        ];

        artifactId = foundArtifact.id;
    }

    function activateArtifact(
        uint256 locationId,
        uint256 artifactId,
        uint256 wormholeTo
    ) public {
        Planet storage planet = gs().planets[locationId];
        ArtifactProperties memory artifact = DFArtifactFacet(address(this)).decodeArtifact(
            artifactId
        );

        require(
            LibGameUtils.isArtifactOnPlanet(locationId, artifactId),
            "can't active an artifact on a planet it's not on"
        );

        if (isSpaceship(artifact.artifactType)) {
            // TODO: fix Crescent functionality
            // activateSpaceshipArtifact(locationId, artifactId, planet, artifact);
        } else {
            activateNonSpaceshipArtifact(locationId, artifactId, wormholeTo, planet, artifact);
        }

        // artifact.activations++;
    }

    function activateSpaceshipArtifact(
        uint256 locationId,
        uint256 artifactId,
        Planet storage planet,
        Artifact storage artifact
    ) private {
        if (artifact.artifactType == ArtifactType.ShipCrescent) {
            require(artifact.activations == 0, "crescent cannot be activated more than once");

            require(
                planet.planetType != PlanetType.SILVER_MINE,
                "cannot turn a silver mine into a silver mine"
            );

            require(planet.owner == address(0), "can only activate crescent on unowned planets");
            require(planet.planetLevel >= 1, "planet level must be more than one");

            artifact.lastActivated = block.timestamp;
            artifact.lastDeactivated = block.timestamp;

            if (planet.silver == 0) {
                planet.silver = 1;
                Planet memory defaultPlanet = LibGameUtils._defaultPlanet(
                    locationId,
                    planet.planetLevel,
                    PlanetType.SILVER_MINE,
                    planet.spaceType,
                    gameConstants().TIME_FACTOR_HUNDREDTHS
                );

                planet.silverGrowth = defaultPlanet.silverGrowth;
            }

            planet.planetType = PlanetType.SILVER_MINE;
            emit ArtifactActivated(msg.sender, locationId, artifactId);
        }
    }

    function activateNonSpaceshipArtifact(
        uint256 locationId,
        uint256 artifactId,
        uint256 wormholeTo,
        Planet storage planet,
        ArtifactProperties memory artifact
    ) private {
        console.log("activating %s on %s", artifactId, locationId);
        require(
            planet.owner == msg.sender,
            "you must own the planet you are activating an artifact on"
        );
        require(
            LibGameUtils.getActiveArtifact(locationId).collectionType == CollectionType.Unknown,
            "there is already an active artifact on this planet"
        );
        require(!planet.destroyed, "planet is destroyed");

        uint256 length = gs().planetArtifacts[locationId].length;
        console.log("artifacts on %s: %s", locationId, length);
        require(
            LibGameUtils.getPlanetArtifact(locationId, artifactId).collectionType !=
                CollectionType.Unknown,
            "this artifact is not on this planet"
        );

        // Unknown is the 0th one, Monolith is the 1st, and so on.
        // TODO v0.6: consider photoid canon
        uint256[10] memory artifactCooldownsHours = [uint256(24), 0, 0, 0, 0, 4, 4, 24, 24, 24];
        // TODO: Cooldown is broken
        // require(
        //     artifact.lastDeactivated +
        //         artifactCooldownsHours[uint256(artifact.artifactType)] *
        //         60 *
        //         60 <
        //         block.timestamp,
        //     "this artifact is on a cooldown"
        // );

        bool shouldDeactivateAndBurn = false;

        // artifact.lastActivated = block.timestamp;
        gs().planetActiveArtifact[locationId] = artifactId;
        emit ArtifactActivated(msg.sender, locationId, artifactId);

        // TODO: Wormhole is broken

        if (artifact.artifactType == ArtifactType.Wormhole) {
            require(wormholeTo != 0, "you must provide a wormholeTo to activate a wormhole");

            require(
                gs().planets[wormholeTo].owner == msg.sender,
                "you can only create a wormhole to a planet you own"
            );
            require(!gs().planets[wormholeTo].destroyed, "planet destroyed");
            // TODO: Store some way to remember where a wormhole is. Maybe new data structure.
            // artifact.wormholeTo = wormholeTo;
            gs().planetWormholes[locationId] = wormholeTo;
        } else if (artifact.artifactType == ArtifactType.BloomFilter) {
            require(
                2 * uint256(artifact.rarity) >= planet.planetLevel,
                "artifact is not powerful enough to apply effect to this planet level"
            );
            planet.population = planet.populationCap;
            planet.silver = planet.silverCap;
            shouldDeactivateAndBurn = true;
        } else if (artifact.artifactType == ArtifactType.BlackDomain) {
            require(
                2 * uint256(artifact.rarity) >= planet.planetLevel,
                "artifact is not powerful enough to apply effect to this planet level"
            );
            planet.destroyed = true;
            shouldDeactivateAndBurn = true;
        }

        if (shouldDeactivateAndBurn) {
            // artifact.lastDeactivated = block.timestamp; // immediately deactivate
            gs().planetActiveArtifact[locationId] = 0; // immediately deactivate

            // artifact, owner
            // TODO: We aren't updating the artifact beacuse there are no properties to change.
            // DFArtifactFacet(address(this)).updateArtifact(artifact, address(this)); // save artifact state immediately, because _takeArtifactOffPlanet will access pull it from tokens contract
            emit ArtifactDeactivated(msg.sender, locationId, artifactId);
            // burn it after use. will be owned by contract but not on a planet anyone can control
            LibGameUtils._takeArtifactOffPlanet(locationId, artifactId);
        } else {
            // TODO: We aren't updating the artifact beacuse there are no properties to change.
            // artifact, owner
            // DFArtifactFacet(address(this)).updateArtifact(artifact, address(this));
        }
        console.log("buffing planet");
        // this is fine even tho some artifacts are immediately deactivated, because
        // those artifacts do not buff the planet.
        LibGameUtils._buffPlanet(locationId, LibGameUtils._getUpgradeForArtifact(artifact));
    }

    function deactivateArtifact(uint256 locationId) public {
        Planet storage planet = gs().planets[locationId];

        require(
            planet.owner == msg.sender,
            "you must own the planet you are deactivating an artifact on"
        );

        require(!gs().planets[locationId].destroyed, "planet is destroyed");

        ArtifactProperties memory artifact = LibGameUtils.getActiveArtifact(locationId);

        require(
            artifact.collectionType != CollectionType.Unknown,
            "this artifact is not activated on this planet"
        );

        // artifact.lastDeactivated = block.timestamp;
        // LOL just pretend there is a wormhole.
        gs().planetWormholes[locationId] = 0;
        gs().planetActiveArtifact[locationId] = 0;
        emit ArtifactDeactivated(msg.sender, artifact.id, locationId);
        // TODO: Figure out update artifact
        // DFArtifactFacet(address(this)).updateArtifact(artifact, address(this));

        bool shouldBurn = artifact.artifactType == ArtifactType.PlanetaryShield ||
            artifact.artifactType == ArtifactType.PhotoidCannon;
        if (shouldBurn) {
            // burn it after use. will be owned by contract but not on a planet anyone can control
            LibGameUtils._takeArtifactOffPlanet(artifact.id, locationId);
        }

        LibGameUtils._debuffPlanet(locationId, LibGameUtils._getUpgradeForArtifact(artifact));
    }

    function depositArtifact(
        uint256 locationId,
        uint256 artifactId,
        address coreAddress
    ) public {
        Planet storage planet = gs().planets[locationId];

        require(!gs().planets[locationId].destroyed, "planet is destroyed");
        require(planet.planetType == PlanetType.TRADING_POST, "can only deposit on trading posts");
        require(
            DFArtifactFacet(address(this)).balanceOf(msg.sender, artifactId) > 0,
            "you can only deposit artifacts you own"
        );
        require(planet.owner == msg.sender, "you can only deposit on a planet you own");

        ArtifactProperties memory artifact = DFArtifactFacet(address(this)).getArtifact(artifactId);
        require(
            planet.planetLevel > uint256(artifact.rarity),
            "spacetime rip not high enough level to deposit this artifact"
        );
        require(!isSpaceship(artifact.artifactType), "cannot deposit spaceships");

        require(gs().planetArtifacts[locationId].length < 5, "too many artifacts on this planet");

        LibGameUtils._putArtifactOnPlanet(locationId, artifactId);
        // artifactId, curr owner, new owner
        DFArtifactFacet(address(this)).transferArtifact(artifactId, msg.sender, coreAddress);
    }

    function withdrawArtifact(uint256 locationId, uint256 artifactId) public {
        Planet storage planet = gs().planets[locationId];

        require(
            planet.planetType == PlanetType.TRADING_POST,
            "can only withdraw from trading posts"
        );
        require(!gs().planets[locationId].destroyed, "planet is destroyed");
        require(planet.owner == msg.sender, "you can only withdraw from a planet you own");
        ArtifactProperties memory artifact = LibGameUtils.getPlanetArtifact(locationId, artifactId);
        // TODO: Write is initialized function.
        require(
            artifact.collectionType != CollectionType.Unknown,
            "this artifact is not on this planet"
        );

        require(
            planet.planetLevel > uint256(artifact.rarity),
            "spacetime rip not high enough level to withdraw this artifact"
        );
        require(!isSpaceship(artifact.artifactType), "cannot withdraw spaceships");
        LibGameUtils._takeArtifactOffPlanet(locationId, artifactId);

        // artifactId, curr owner, new owner
        DFArtifactFacet(address(this)).transferArtifact(artifactId, address(this), msg.sender);
    }

    function prospectPlanet(uint256 locationId) public {
        Planet storage planet = gs().planets[locationId];

        require(!planet.destroyed, "planet is destroyed");
        require(planet.planetType == PlanetType.RUINS, "you can't find an artifact on this planet");
        require(planet.owner == msg.sender, "you must own this planet");
        require(planet.prospectedBlockNumber == 0, "this planet has already been prospected");

        if (gameConstants().SPACESHIPS.GEAR) {
            require(containsGear(locationId), "gear ship must be present on planet");
        }

        planet.prospectedBlockNumber = block.number;
    }

    function containsGear(uint256 locationId) public view returns (bool) {
        uint256[] memory artifactIds = gs().planetArtifacts[locationId];

        for (uint256 i = 0; i < artifactIds.length; i++) {
            ArtifactProperties memory artifact = DFArtifactFacet(address(this)).getArtifact(
                artifactIds[i]
            );
            if (
                // TODO: Gear is broken
                artifact.artifactType == ArtifactType.ShipGear // && msg.sender == artifact.controller
            ) {
                return true;
            }
        }

        return false;
    }

    function isSpaceship(ArtifactType artifactType) public pure returns (bool) {
        return
            artifactType >= ArtifactType.ShipMothership && artifactType <= ArtifactType.ShipTitan;
    }
}
