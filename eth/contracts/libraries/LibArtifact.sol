// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * Library for all things Artifacts
 */

// Library imports
import {LibUtils} from "./LibUtils.sol";

// Storage imports
import {LibStorage, GameStorage, GameConstants, SnarkConstants} from "./LibStorage.sol";

// Type imports
import {Artifact, ArtifactInfo, ArtifactRarity, ArtifactType, Biome, SpaceType, TokenType, Upgrade} from "../DFTypes.sol";

library LibArtifact {
    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    /**
     * @notice Create the token ID for a Artifact with the following properties:
     * @param _rarity Artifact
     * @param _artifactType Artifact
     * @param _biome Artifact
     */
    function create(
        ArtifactRarity _rarity,
        ArtifactType _artifactType,
        Biome _biome
    ) internal pure returns (uint256) {
        // x << y is equivalent to the mathematical expression x * 2**y
        require(isValidArtifactRarity(_rarity), "artifact rarity is not valid");
        require(isValidArtifactType(_artifactType), "artifact type is not valid");
        require(isValidBiome(_biome), "artifact biome is not valid");

        uint256 tokenType = LibUtils.shiftLeft(
            uint8(TokenType.Artifact), // value
            uint8(ArtifactInfo.TokenType) // chunk position in tokenId
        );
        uint256 rarity = LibUtils.shiftLeft(uint8(_rarity), uint8(ArtifactInfo.ArtifactRarity));
        uint256 artifactType = LibUtils.shiftLeft(
            uint8(_artifactType),
            uint8(ArtifactInfo.ArtifactType)
        );
        uint256 biome = LibUtils.shiftLeft(uint8(_biome), uint8(ArtifactInfo.Biome));
        return tokenType + rarity + artifactType + biome;
    }

    function decode(uint256 artifactId) internal pure returns (Artifact memory) {
        bytes memory _b = abi.encodePacked(artifactId);
        uint8 tokenIdx = uint8(ArtifactInfo.TokenType) - 1; // account for Unknown at 0
        uint8 rarityIdx = uint8(ArtifactInfo.ArtifactRarity) - 1;
        uint8 typeIdx = uint8(ArtifactInfo.ArtifactType) - 1;
        uint8 biomeIdx = uint8(ArtifactInfo.Biome) - 1;

        TokenType tokenType = TokenType(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));
        ArtifactRarity rarity = ArtifactRarity(
            LibUtils.calculateByteUInt(_b, rarityIdx, rarityIdx)
        );
        ArtifactType artifactType = ArtifactType(LibUtils.calculateByteUInt(_b, typeIdx, typeIdx));
        Biome biome = Biome(LibUtils.calculateByteUInt(_b, biomeIdx, biomeIdx));

        require(isArtifact(artifactId), "token type is not artifact");
        require(isValidArtifactRarity(rarity), "artifact rarity is not valid");
        require(isValidArtifactType(artifactType), "artifact type is not valid");
        require(isValidBiome(biome), "artifact biome is not valid");

        return
            Artifact({
                id: artifactId,
                tokenType: tokenType,
                rarity: rarity,
                artifactType: artifactType,
                planetBiome: biome
            });
    }

    function isValidArtifactRarity(ArtifactRarity rarity) internal pure returns (bool) {
        return (rarity >= ArtifactRarity.Common && rarity <= ArtifactRarity.Mythic);
    }

    function isValidArtifactType(ArtifactType artifactType) internal pure returns (bool) {
        return (artifactType >= ArtifactType.Monolith && artifactType <= ArtifactType.BlackDomain);
    }

    function isValidBiome(Biome biome) internal pure returns (bool) {
        return (biome >= Biome.Ocean && biome <= Biome.Corrupted);
    }

    function isArtifact(uint256 tokenId) internal pure returns (bool) {
        bytes memory _b = abi.encodePacked(tokenId);
        uint8 tokenIdx = uint8(ArtifactInfo.TokenType) - 1;
        uint8 tokenType = uint8(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));
        return (TokenType(tokenType) == TokenType.Artifact);
    }

    function getUpgradeForArtifact(Artifact memory artifact)
        internal
        pure
        returns (Upgrade memory)
    {
        if (artifact.artifactType == ArtifactType.PlanetaryShield) {
            uint256[6] memory defenseMultipliersPerRarity = [uint256(100), 150, 200, 300, 450, 650];

            return
                Upgrade({
                    popCapMultiplier: 100,
                    popGroMultiplier: 100,
                    rangeMultiplier: 20,
                    speedMultiplier: 20,
                    defMultiplier: defenseMultipliersPerRarity[uint256(artifact.rarity)]
                });
        }

        if (artifact.artifactType == ArtifactType.PhotoidCannon) {
            uint256[6] memory def = [uint256(100), 50, 40, 30, 20, 10];
            return
                Upgrade({
                    popCapMultiplier: 100,
                    popGroMultiplier: 100,
                    rangeMultiplier: 100,
                    speedMultiplier: 100,
                    defMultiplier: def[uint256(artifact.rarity)]
                });
        }

        if (uint256(artifact.artifactType) >= 5) {
            return
                Upgrade({
                    popCapMultiplier: 100,
                    popGroMultiplier: 100,
                    rangeMultiplier: 100,
                    speedMultiplier: 100,
                    defMultiplier: 100
                });
        }

        Upgrade memory ret = Upgrade({
            popCapMultiplier: 100,
            popGroMultiplier: 100,
            rangeMultiplier: 100,
            speedMultiplier: 100,
            defMultiplier: 100
        });

        if (artifact.artifactType == ArtifactType.Monolith) {
            ret.popCapMultiplier += 5;
            ret.popGroMultiplier += 5;
        } else if (artifact.artifactType == ArtifactType.Colossus) {
            ret.speedMultiplier += 5;
        } else if (artifact.artifactType == ArtifactType.Pyramid) {
            ret.defMultiplier += 5;
        }

        if (artifact.planetBiome == Biome.Ocean) {
            ret.speedMultiplier += 5;
            ret.defMultiplier += 5;
        } else if (artifact.planetBiome == Biome.Forest) {
            ret.defMultiplier += 5;
            ret.popCapMultiplier += 5;
            ret.popGroMultiplier += 5;
        } else if (artifact.planetBiome == Biome.Grassland) {
            ret.popCapMultiplier += 5;
            ret.popGroMultiplier += 5;
            ret.rangeMultiplier += 5;
        } else if (artifact.planetBiome == Biome.Tundra) {
            ret.defMultiplier += 5;
            ret.rangeMultiplier += 5;
        } else if (artifact.planetBiome == Biome.Swamp) {
            ret.speedMultiplier += 5;
            ret.rangeMultiplier += 5;
        } else if (artifact.planetBiome == Biome.Desert) {
            ret.speedMultiplier += 10;
        } else if (artifact.planetBiome == Biome.Ice) {
            ret.rangeMultiplier += 10;
        } else if (artifact.planetBiome == Biome.Wasteland) {
            ret.defMultiplier += 10;
        } else if (artifact.planetBiome == Biome.Lava) {
            ret.popCapMultiplier += 10;
            ret.popGroMultiplier += 10;
        } else if (artifact.planetBiome == Biome.Corrupted) {
            ret.rangeMultiplier += 5;
            ret.speedMultiplier += 5;
            ret.popCapMultiplier += 5;
            ret.popGroMultiplier += 5;
        }

        uint256 scale = 1 + (uint256(artifact.rarity) / 2);

        ret.popCapMultiplier = scale * ret.popCapMultiplier - (scale - 1) * 100;
        ret.popGroMultiplier = scale * ret.popGroMultiplier - (scale - 1) * 100;
        ret.speedMultiplier = scale * ret.speedMultiplier - (scale - 1) * 100;
        ret.rangeMultiplier = scale * ret.rangeMultiplier - (scale - 1) * 100;
        ret.defMultiplier = scale * ret.defMultiplier - (scale - 1) * 100;

        return ret;
    }

    function artifactRarityFromPlanetLevel(uint256 planetLevel)
        internal
        pure
        returns (ArtifactRarity)
    {
        if (planetLevel <= 1) return ArtifactRarity.Common;
        else if (planetLevel <= 3) return ArtifactRarity.Rare;
        else if (planetLevel <= 5) return ArtifactRarity.Epic;
        else if (planetLevel <= 7) return ArtifactRarity.Legendary;
        else return ArtifactRarity.Mythic;
    }

    // an artifact is only considered 'activated' if this method returns true.
    // we do not have an `isActive` field on artifact; the times that the
    // artifact was last activated and deactivated are sufficent to determine
    // whether or not the artifact is activated.

    function isActivated(uint256 locationId, uint256 artifactId) internal view returns (bool) {
        return (gs().planets[locationId].activeArtifact == artifactId);
    }

    function isArtifactOnPlanet(uint256 locationId, uint256 artifactId)
        internal
        view
        returns (bool)
    {
        for (uint256 i; i < gs().planets[locationId].artifacts.length; i++) {
            if (gs().planets[locationId].artifacts[i] == artifactId) {
                return true;
            }
        }

        return false;
    }

    function randomArtifactTypeAndLevelBonus(
        uint256 artifactSeed,
        Biome biome,
        SpaceType spaceType
    ) internal pure returns (ArtifactType, uint256) {
        uint256 lastByteOfSeed = artifactSeed % 0xFF;
        uint256 secondLastByteOfSeed = ((artifactSeed - lastByteOfSeed) / 256) % 0xFF;

        ArtifactType artifactType = ArtifactType.Pyramid;

        if (lastByteOfSeed < 39) {
            artifactType = ArtifactType.Monolith;
        } else if (lastByteOfSeed < 78) {
            artifactType = ArtifactType.Colossus;
        } else if (lastByteOfSeed < 156) {
            artifactType = ArtifactType.Pyramid;
        } else if (lastByteOfSeed < 171) {
            artifactType = ArtifactType.Wormhole;
        } else if (lastByteOfSeed < 186) {
            artifactType = ArtifactType.PlanetaryShield;
        } else if (lastByteOfSeed < 201) {
            artifactType = ArtifactType.PhotoidCannon;
        } else if (lastByteOfSeed < 216) {
            artifactType = ArtifactType.BloomFilter;
        } else if (lastByteOfSeed < 231) {
            artifactType = ArtifactType.BlackDomain;
        } else {
            if (biome == Biome.Ice) {
                artifactType = ArtifactType.PlanetaryShield;
            } else if (biome == Biome.Lava) {
                artifactType = ArtifactType.PhotoidCannon;
            } else if (biome == Biome.Wasteland) {
                artifactType = ArtifactType.BloomFilter;
            } else if (biome == Biome.Corrupted) {
                artifactType = ArtifactType.BlackDomain;
            } else {
                artifactType = ArtifactType.Wormhole;
            }
        }

        uint256 bonus = 0;
        if (secondLastByteOfSeed < 4) {
            bonus = 2;
        } else if (secondLastByteOfSeed < 16) {
            bonus = 1;
        }

        return (artifactType, bonus);
    }

    function putArtifactOnPlanet(uint256 locationId, uint256 artifactId) internal {
        gs().planets[locationId].artifacts.push(artifactId);
    }

    /**
     * Remove artifactId from planet with locationId if artifactId exists AND is not active.
     */
    function takeArtifactOffPlanet(uint256 locationId, uint256 artifactId) internal {
        uint256 artifactsOnThisPlanet = gs().planets[locationId].artifacts.length;

        bool hadTheArtifact = false;

        for (uint256 i = 0; i < artifactsOnThisPlanet; i++) {
            if (gs().planets[locationId].artifacts[i] == artifactId) {
                require(
                    !isActivated(locationId, artifactId),
                    "you cannot take an activated artifact off a planet"
                );

                gs().planets[locationId].artifacts[i] = gs().planets[locationId].artifacts[
                    artifactsOnThisPlanet - 1
                ];

                hadTheArtifact = true;
                break;
            }
        }

        require(hadTheArtifact, "this artifact was not present on this planet");
        gs().planets[locationId].artifacts.pop();
    }

    // if the given planet has an activated artifact on it, then return the artifact
    // otherwise, return a 'null artifact'
    function getActiveArtifact(uint256 locationId) internal view returns (Artifact memory) {
        require(hasActiveArtifact(locationId), "planet does not have an active artifact");
        uint256 artifactId = gs().planets[locationId].activeArtifact;
        return LibArtifact.decode(artifactId);
    }

    function hasActiveArtifact(uint256 locationId) internal view returns (bool) {
        uint256 artifactId = gs().planets[locationId].activeArtifact;
        return artifactId != 0;
    }

    // if the given artifact is on the given planet, then return the artifact
    // otherwise, throw error
    function getPlanetArtifact(uint256 locationId, uint256 artifactId)
        internal
        view
        returns (Artifact memory a)
    {
        bool found = false;
        for (uint256 i; i < gs().planets[locationId].artifacts.length; i++) {
            if (gs().planets[locationId].artifacts[i] == artifactId) {
                a = LibArtifact.decode(artifactId);
                found = true;
                return a;
            }
        }

        require(found, "artifact not found");
    }
}
