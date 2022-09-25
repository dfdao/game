// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";
import "hardhat/console.sol";

// Note: We can call _mint and _setTokenUri directly in DFArtifactFacet, but I like having a wrapper
// This makes it more obvious when we are using the DFToken functions

contract DFToken is SolidStateERC1155 {
    enum ArtifactInfo {
        Unknown,
        Level,
        ArtifactType,
        Biome
    }

    struct Artifact {
        uint8 level;
        uint8 artifactType;
        uint8 biome;
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public {
        _mint(account, id, amount, data);
    }

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

    function encodeArtifact(
        uint256 _level,
        uint256 _artifactType,
        uint256 _biome
    ) public pure returns (uint256) {
        uint256 level = _level << calcBitShift(uint8(ArtifactInfo.Level));
        uint256 artifactType = _artifactType << calcBitShift(uint8(ArtifactInfo.ArtifactType));
        uint256 biome = _biome << calcBitShift(uint8(ArtifactInfo.Biome));
        return level + artifactType + biome;
    }

    function decodeArtifact(uint256 artifactId) public pure returns (Artifact memory) {
        bytes memory _b = abi.encodePacked(artifactId);
        // 0 is left most element. 0 is given the property Unknown in ArtifactInfo.

        // Note: Bit shifting requires an index greater than zero. This is why the ArtifactInfo has
        // Unknown as the zero property, so calcBitShift(ArtifactInfo.Level) is correct.
        // As a consequence, we need to
        // offset fetching the relevant byte from the artifactId by 1.
        // However
        uint8 level = uint8(_b[uint8(ArtifactInfo.Level) - 1]);
        uint8 artifactType = uint8(_b[uint8(ArtifactInfo.ArtifactType) - 1]);
        uint8 biome = uint8(_b[uint8(ArtifactInfo.Biome) - 1]);
        return Artifact(level, artifactType, biome);
        // return level + artifactType + biome;
    }
}
