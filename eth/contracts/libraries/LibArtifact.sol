// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * Library for all things Artifacts
 */

// Contract imports
import "hardhat/console.sol";

// Library imports
import {LibUtils} from "./LibUtils.sol";

// Storage imports

// Type imports
import {Artifact, ArtifactInfo, ArtifactRarity, ArtifactType, Biome, TokenType} from "../DFTypes.sol";

library LibArtifact {
    /**
     * @notice Create the token ID for a Artifact with the following properties:
     * @param artifact Artifact
     */
    function encode(Artifact memory artifact) internal view returns (uint256) {
        // x << y is equivalent to the mathematical expression x * 2**y
        uint256 tokenType = LibUtils.shiftLeft(
            uint8(artifact.tokenType),
            uint8(ArtifactInfo.TokenType)
        );
        uint256 rarity = LibUtils.shiftLeft(
            uint8(artifact.rarity),
            uint8(ArtifactInfo.ArtifactRarity)
        );
        uint256 artifactType = LibUtils.shiftLeft(
            uint8(artifact.artifactType),
            uint8(ArtifactInfo.ArtifactType)
        );
        uint256 biome = LibUtils.shiftLeft(uint8(artifact.planetBiome), uint8(ArtifactInfo.Biome));
        return tokenType + rarity + artifactType + biome;
    }

    function decode(uint256 artifactId) internal pure returns (Artifact memory) {
        bytes memory _b = abi.encodePacked(artifactId);
        uint8 tokenIdx = uint8(ArtifactInfo.TokenType) - 1; // account for Unknown at 0
        uint8 rarityIdx = uint8(ArtifactInfo.ArtifactRarity) - 1;
        uint8 typeIdx = uint8(ArtifactInfo.ArtifactType) - 1;
        uint8 biomeIdx = uint8(ArtifactInfo.Biome) - 1;

        uint8 tokenType = uint8(LibUtils.calculateByteUInt(_b, tokenIdx, tokenIdx));
        uint8 rarity = uint8(LibUtils.calculateByteUInt(_b, rarityIdx, rarityIdx));
        uint8 artifactType = uint8(LibUtils.calculateByteUInt(_b, typeIdx, typeIdx));
        uint8 biome = uint8(LibUtils.calculateByteUInt(_b, biomeIdx, biomeIdx));
        return
            Artifact({
                id: artifactId,
                tokenType: TokenType(tokenType),
                rarity: ArtifactRarity(rarity),
                artifactType: ArtifactType(artifactType),
                planetBiome: Biome(biome)
            });
    }
}
