// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";
import {ArtifactProperties, TokenInfo, CollectionType, ArtifactType, ArtifactRarity, Biome} from "./DFTypes.sol";
import "hardhat/console.sol";

// Note: We can call _mint and _setTokenUri directly in DFArtifactFacet, but I like having a wrapper
// This makes it more obvious when we are using the DFToken functions
contract DFToken is SolidStateERC1155 {
    /**
     * @notice set per-token metadata URI
     * @param tokenId token whose metadata URI to set
     * @param tokenURI per-token URI
     */
    function setTokenURI(uint256 tokenId, string memory tokenURI) public {
        _setTokenURI(tokenId, tokenURI);
    }

    /**
     * @notice calculate amount of bits to shift left
     * @param index number of 1 byte words to shift from left
     * @return shift length of left shift
     */
    function calcBitShift(uint8 index) internal pure returns (uint8) {
        uint8 maxVal = 32;

        require(index <= maxVal, "shift index is too high");
        require(index > 0, "shift index is too low");

        uint256 bin = 8;
        uint256 shift = 256;
        return uint8(shift - (bin * index));
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
        uint256 collectionType = _collectionType << calcBitShift(uint8(TokenInfo.CollectionType));
        uint256 rarity = _rarity << calcBitShift(uint8(TokenInfo.ArtifactRarity));
        uint256 artifactType = _artifactType << calcBitShift(uint8(TokenInfo.ArtifactType));
        uint256 biome = _biome << calcBitShift(uint8(TokenInfo.Biome));
        return collectionType + rarity + artifactType + biome;
    }

    /**
     * @notice Fetch the ArtifactProperties for the given id
     * @param artifactId type of artifact
     */
    function decodeArtifact(uint256 artifactId) public pure returns (ArtifactProperties memory) {
        bytes memory _b = abi.encodePacked(artifactId);
        // 0 is left most element. 0 is given the property Unknown in TokenInfo.

        // Note: Bit shifting requires an index greater than zero. This is why the TokenInfo has
        // Unknown as the zero property, so calcBitShift(TokenInfo.Level) is correct.
        // As a consequence, we need to
        // offset fetching the relevant byte from the artifactId by 1.
        // However
        uint8 collectionType = uint8(_b[uint8(TokenInfo.CollectionType) - 1]);
        uint8 rarity = uint8(_b[uint8(TokenInfo.ArtifactRarity) - 1]);
        uint8 artifactType = uint8(_b[uint8(TokenInfo.ArtifactType) - 1]);
        uint8 biome = uint8(_b[uint8(TokenInfo.Biome) - 1]);

        ArtifactProperties memory a = ArtifactProperties({
            id: artifactId,
            collectionType: CollectionType(collectionType),
            rarity: ArtifactRarity(rarity),
            artifactType: ArtifactType(artifactType),
            planetBiome: Biome(biome)
        });

        return a;
    }
}
