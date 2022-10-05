// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";
import {LibArtifact} from "../libraries/LibArtifact.sol";
import {LibSilver} from "../libraries/LibSilver.sol";

// External contract imports
import {DFArtifactFacet} from "./DFArtifactFacet.sol";
import {DFTokenFacet} from "./DFTokenFacet.sol";

// Type imports
import {
    Player,
    Artifact,
    ArtifactRarity,
    ArtifactType,
    SpaceshipType,
    Biome,
    TokenType,
    DFTCreateArtifactArgs,
    DFPFindArtifactArgs
} from "../DFTypes.sol";

contract DFShopFacet is WithStorage {

    event ArtifactPurchased(address buyer, uint256 tokenId);

    function purchaseArtifact(ArtifactType artifactType, ArtifactRarity rarity) public {

        Player storage p = gs().players[msg.sender];
        uint256 artifactPrice = getArtifactPrice(artifactType, rarity);

        require(p.score >=  DFTokenFacet(address(this)).getSilverBalance(msg.sender), 'not enough silver to purchase this artifact');

        uint256 tokenId = LibArtifact.create(rarity, artifactType, Biome.Unknown);

        DFTokenFacet(address(this)).mint(msg.sender, tokenId, 1);
        DFTokenFacet(address(this)).burn(msg.sender, LibSilver.create(), artifactPrice);

        emit ArtifactPurchased(msg.sender, tokenId);
    }


    function getArtifactPrice(ArtifactType artifactType, ArtifactRarity rarity) internal view returns (uint256){

        uint256 typePrice = 0;
        if(artifactType == ArtifactType.Monolith){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.Monolith;
        } else if (artifactType == ArtifactType.Colossus){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.Colossus;
        }else if (artifactType == ArtifactType.Spaceship){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.Spaceship;
        }else if (artifactType == ArtifactType.Pyramid){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.Pyramid;
        }else if (artifactType == ArtifactType.Wormhole){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.Wormhole;
        }else if (artifactType == ArtifactType.PlanetaryShield){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.PlanetaryShield;
        }else if (artifactType == ArtifactType.PhotoidCannon){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.PhotoidCannon;
        }else if (artifactType == ArtifactType.BloomFilter){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.BloomFilter;
        }else if (artifactType == ArtifactType.BlackDomain){
            typePrice = gameConstants().ARTIFACT_TYPE_PRICES.BlackDomain;
        }

        uint256 rarityPrice = 0;
        if(rarity == ArtifactRarity.Common) {
            rarityPrice = gameConstants().ARTIFACT_RARITY_PRICES.Common;
        } else if(rarity == ArtifactRarity.Rare) {
            rarityPrice = gameConstants().ARTIFACT_RARITY_PRICES.Rare;
        } else if(rarity == ArtifactRarity.Epic) {
            rarityPrice = gameConstants().ARTIFACT_RARITY_PRICES.Epic;
        } else if(rarity == ArtifactRarity.Legendary) {
            rarityPrice = gameConstants().ARTIFACT_RARITY_PRICES.Legendary;
        } else if(rarity == ArtifactRarity.Mythic) {
            rarityPrice = gameConstants().ARTIFACT_RARITY_PRICES.Mythic;
        }

        return typePrice * rarityPrice;
    }
}

