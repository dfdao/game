// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// External contract imports
import {DFArtifactFacet} from "../facets/DFArtifactFacet.sol";
import {DFGetterFacet} from "../facets/DFGetterFacet.sol";

// Library imports
import {LibArtifact} from "./LibArtifact.sol";
import {LibGameUtils} from "./LibGameUtils.sol";
import {LibSpaceship} from "./LibSpaceship.sol";
import {LibUtils} from "./LibUtils.sol";

// Storage imports
import {LibStorage, GameStorage, GameConstants} from "./LibStorage.sol";

// Type imports
import {Biome, Planet, PlanetType, ArtifactType, ArtifactRarity, TokenType, DFPFindArtifactArgs, DFTCreateArtifactArgs, Artifact, ArtifactInfo, Spaceship, SpaceshipType} from "../DFTypes.sol";
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
        SpaceshipType shipType
    ) public returns (uint256) {
        require(shipType != SpaceshipType.Unknown, "incorrect ship type");
        // require(gs().miscNonce < MAX UINT 128) but won't happen.
        uint128 id = uint128(gs().miscNonce++);
        uint256 tokenId = LibSpaceship.encode(
            Spaceship({id: 0, tokenType: TokenType.Spaceship, spaceshipType: shipType})
        );

        Spaceship memory spaceship = DFArtifactFacet(address(this)).createSpaceship(
            tokenId + id, // Make each ship unique
            owner
        );
        LibGameUtils._putSpaceshipOnPlanet(planetId, spaceship.id);

        return spaceship.id;
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
        uint256 tokenId = LibArtifact.encode(
            Artifact({
                id: 0,
                tokenType: TokenType.Artifact,
                rarity: rarity,
                artifactType: artifactType,
                planetBiome: biome
            })
        );

        Artifact memory foundArtifact = DFArtifactFacet(address(this)).createArtifact(
            tokenId,
            args.coreAddress
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
        Artifact memory artifact = decodeArtifact(artifactId);

        if (LibSpaceship.isShip(artifactId)) {
            require(
                LibGameUtils.isSpaceshipOnPlanet(locationId, artifactId),
                "can't activate a ship on a planet it's not on"
            );
            activateSpaceshipArtifact(locationId, artifactId, planet);
        } else {
            require(
                LibGameUtils.isArtifactOnPlanet(locationId, artifactId),
                "can't activate an artifact on a planet it's not on"
            );
            activateNonSpaceshipArtifact(locationId, artifactId, wormholeTo, planet, artifact);
        }
    }

    function activateSpaceshipArtifact(
        uint256 locationId,
        uint256 shipId,
        Planet storage planet
    ) private {
        Spaceship memory s = LibSpaceship.decode(shipId);
        if (s.spaceshipType == SpaceshipType.ShipCrescent) {
            require(
                planet.planetType != PlanetType.SILVER_MINE,
                "cannot turn a silver mine into a silver mine"
            );

            require(planet.owner == address(0), "can only activate crescent on unowned planets");
            require(planet.planetLevel >= 1, "planet level must be more than zero");

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
            emit ArtifactActivated(msg.sender, locationId, shipId);

            // TODO: Why not actually burn?
            // burn it after use. will be owned by contract but not on a planet anyone can control
            LibGameUtils._takeSpaceshipOffPlanet(locationId, shipId);
            emit ArtifactDeactivated(msg.sender, locationId, shipId);
        }
    }

    function activateNonSpaceshipArtifact(
        uint256 locationId,
        uint256 artifactId,
        uint256 wormholeTo,
        Planet storage planet,
        Artifact memory artifact
    ) private {
        require(
            planet.owner == msg.sender,
            "you must own the planet you are activating an artifact on"
        );
        require(
            getActiveArtifact(locationId).tokenType == TokenType.Unknown,
            "there is already an active artifact on this planet"
        );
        require(!planet.destroyed, "planet is destroyed");

        require(
            getPlanetArtifact(locationId, artifactId).tokenType != TokenType.Unknown,
            "this artifact is not on this planet"
        );

        bool shouldDeactivateAndBurn = false;

        gs().planetArtifactActivationTime[locationId] = block.timestamp;
        gs().planetActiveArtifact[locationId] = artifactId;
        emit ArtifactActivated(msg.sender, locationId, artifactId);

        if (artifact.artifactType == ArtifactType.Wormhole) {
            require(wormholeTo != 0, "you must provide a wormholeTo to activate a wormhole");

            require(
                gs().planets[wormholeTo].owner == msg.sender,
                "you can only create a wormhole to a planet you own"
            );
            require(!gs().planets[wormholeTo].destroyed, "planet destroyed");
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
            gs().planetActiveArtifact[locationId] = 0; // immediately remove activate artifact

            emit ArtifactDeactivated(msg.sender, locationId, artifactId);
            // burn it after use. will be owned by contract but not on a planet anyone can control
            LibGameUtils._takeArtifactOffPlanet(locationId, artifactId);
        }
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

        Artifact memory artifact = getActiveArtifact(locationId);

        require(
            artifact.tokenType != TokenType.Unknown,
            "this artifact is not activated on this planet"
        );

        // artifact.lastDeactivated = block.timestamp;
        // LOL just pretend there is a wormhole.
        gs().planetWormholes[locationId] = 0;
        gs().planetActiveArtifact[locationId] = 0;
        gs().planetArtifactActivationTime[locationId] = 0;

        emit ArtifactDeactivated(msg.sender, artifact.id, locationId);

        bool shouldBurn = artifact.artifactType == ArtifactType.PlanetaryShield ||
            artifact.artifactType == ArtifactType.PhotoidCannon;
        if (shouldBurn) {
            // burn it after use. will be owned by contract but not on a planet anyone can control
            LibGameUtils._takeArtifactOffPlanet(locationId, artifact.id);
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
            DFArtifactFacet(address(this)).tokenExists(msg.sender, artifactId),
            "you can only deposit artifacts you own"
        );
        require(planet.owner == msg.sender, "you can only deposit on a planet you own");

        Artifact memory artifact = decodeArtifact(artifactId);
        require(
            planet.planetLevel > uint256(artifact.rarity),
            "spacetime rip not high enough level to deposit this artifact"
        );
        require(!LibSpaceship.isShip(artifactId), "cannot deposit spaceships");

        require(
            gs().planetArtifacts[locationId].length + gs().planetSpaceships[locationId].length < 5,
            "too many tokens on this planet"
        );

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
        Artifact memory artifact = getPlanetArtifact(locationId, artifactId);

        require(
            planet.planetLevel > uint256(artifact.rarity),
            "spacetime rip not high enough level to withdraw this artifact"
        );
        require(!LibSpaceship.isShip(artifactId), "cannot withdraw spaceships");
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
        uint256[] memory tokenIds = gs().planetSpaceships[locationId];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            Spaceship memory spaceship = LibSpaceship.decode(tokenIds[i]);
            if (
                spaceship.spaceshipType == SpaceshipType.ShipGear &&
                DFArtifactFacet(address(this)).tokenExists(msg.sender, tokenIds[i])
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Create the collection ID for a given artifact
     * @param _collectionType type of artifact
     * @param _rarity rarity of artifact
     * @param _artifactType of artifact
     * @param _biome of artifact
     * @notice this is not a struct because I can't figure out how to bit shift a uint in a struct.
     */
    function encodeArtifact(
        uint256 _collectionType,
        uint256 _rarity,
        uint256 _artifactType,
        uint256 _biome
    ) public pure returns (uint256) {
        uint256 tokenType = _collectionType << LibUtils.calcBitShift(uint8(ArtifactInfo.TokenType));
        uint256 rarity = _rarity << LibUtils.calcBitShift(uint8(ArtifactInfo.ArtifactRarity));
        uint256 artifactType = _artifactType <<
            LibUtils.calcBitShift(uint8(ArtifactInfo.ArtifactType));
        uint256 biome = _biome << LibUtils.calcBitShift(uint8(ArtifactInfo.Biome));
        return tokenType + rarity + artifactType + biome;
    }

    /**
     * @notice Fetch the Artifact for the given id
     * @param artifactId type of artifact
     */
    function decodeArtifact(uint256 artifactId) public pure returns (Artifact memory) {
        bytes memory _b = abi.encodePacked(artifactId);
        // 0 is left most element. 0 is given the property Unknown in ArtifactInfo.

        // Note: Bit shifting requires an index greater than zero. This is why the ArtifactInfo has
        // Unknown as the zero property, so calcBitShift(ArtifactInfo.Level) is correct.
        // As a consequence, we need to
        // offset fetching the relevant byte from the artifactId by 1.
        // However
        uint8 tokenType = uint8(_b[uint8(ArtifactInfo.TokenType) - 1]);
        uint8 rarity = uint8(_b[uint8(ArtifactInfo.ArtifactRarity) - 1]);
        uint8 artifactType = uint8(_b[uint8(ArtifactInfo.ArtifactType) - 1]);
        uint8 biome = uint8(_b[uint8(ArtifactInfo.Biome) - 1]);

        Artifact memory a = Artifact({
            id: artifactId,
            tokenType: TokenType(tokenType),
            rarity: ArtifactRarity(rarity),
            artifactType: ArtifactType(artifactType),
            planetBiome: Biome(biome)
        });

        return a;
    }

    // if the given planet has an activated artifact on it, then return the artifact
    // otherwise, return a 'null artifact'
    function getActiveArtifact(uint256 locationId) public view returns (Artifact memory) {
        uint256 artifactId = gs().planetActiveArtifact[locationId];
        if (artifactId != 0) return decodeArtifact(artifactId);

        return _nullArtifactProperties();
    }

    function _nullArtifactProperties() private pure returns (Artifact memory) {
        return
            Artifact(
                0,
                TokenType.Unknown,
                ArtifactRarity.Unknown,
                ArtifactType.Unknown,
                Biome.Unknown
            );
    }

    // if the given artifact is on the given planet, then return the artifact
    // otherwise, return a 'null' artifact
    function getPlanetArtifact(uint256 locationId, uint256 artifactId)
        public
        view
        returns (Artifact memory a)
    {
        bool found = false;
        for (uint256 i; i < gs().planetArtifacts[locationId].length; i++) {
            if (gs().planetArtifacts[locationId][i] == artifactId) {
                a = decodeArtifact(artifactId);
                found = true;
                return a;
            }
        }

        require(found, "artifact not found");
    }
}
