// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";


// Type imports
import {Artifact, ArtifactRarity, ArtifactType, SpaceshipType, Biome, TokenType, DFTCreateArtifactArgs, DFPFindArtifactArgs} from "../DFTypes.sol";
contract DFShopFacet is WithStorage {

    event ArtifactPurchased();
    event SpaceshipPurchased();

    function purchaseArtifact(ArtifactType artifactType, ArtifactRarity rarity) public {

        emit ArtifactPurchased();
    }

    function purchaseSpaceship(SpaceshipType spaceship) public {

        emit SpaceshipPurchased();
    }
}
