// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// External contract imports
import {DFArtifactFacet} from "./DFArtifactFacet.sol";
import {DFTokenFacet} from "./DFTokenFacet.sol";

// Library imports
import {LibArtifact} from "../libraries/LibArtifact.sol";
import {LibArtifactUtils} from "../libraries/LibArtifactUtils.sol";
import {LibSpaceship} from "../libraries/LibSpaceship.sol";
import {LibGameUtils} from "../libraries/LibGameUtils.sol";
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibSilver} from "../libraries/LibSilver.sol";

// Storage imports
import {WithStorage, SnarkConstants, GameConstants} from "../libraries/LibStorage.sol";

// Type imports
import {RevealedCoords, Artifact, ArrivalData, Planet, PlanetEventType, PlanetEventMetadata, PlanetDefaultStats, PlanetData, Player, Upgrade, ArtifactType, ArtifactRarity, Biome, SpaceshipType} from "../DFTypes.sol";

contract DFGetterFacet2 is WithStorage {
    function getArtifactActivationTimeOnPlanet(uint256 locationId) public view returns (uint256) {
        return gs().planets[locationId].artifactActivationTime;
    }

    function getUpgradeForArtifact(uint256 artifactId) public pure returns (Upgrade memory) {
        return LibArtifact.getUpgradeForArtifact(LibArtifact.decode(artifactId));
    }

    function getArtifactsOnPlanet(uint256 locationId) public view returns (Artifact[] memory ret) {
        uint256[] memory artifactIds = gs().planets[locationId].artifacts;
        ret = new Artifact[](artifactIds.length);
        for (uint256 i = 0; i < artifactIds.length; i++) {
            ret[i] = LibArtifact.decode(artifactIds[i]);
        }
        return ret;
    }

    function hasActiveArtifact(uint256 locationId) public view returns (bool) {
        return LibArtifact.hasActiveArtifact(locationId);
    }

    function getActiveArtifactOnPlanet(uint256 locationId)
        public
        view
        returns (Artifact memory ret)
    {
        uint256 artifactId = gs().planets[locationId].activeArtifact;
        return LibArtifact.decode(artifactId);
    }

    function bulkGetPlanetAritfacts(uint256[] calldata planetIds)
        public
        view
        returns (Artifact[][] memory)
    {
        Artifact[][] memory ret = new Artifact[][](planetIds.length);

        for (uint256 i = 0; i < planetIds.length; i++) {
            uint256[] memory artifactsOnPlanet = gs().planets[planetIds[i]].artifacts;
            ret[i] = bulkGetArtifactsByIds(artifactsOnPlanet);
        }

        return ret;
    }

    function bulkGetArtifactsByIds(uint256[] memory artifactIds)
        public
        pure
        returns (Artifact[] memory ret)
    {
        ret = new Artifact[](artifactIds.length);

        for (uint256 i = 0; i < artifactIds.length; i++) {
            ret[i] = LibArtifact.decode(artifactIds[i]);
        }
    }

    function getPlayerArtifacts(address player) public view returns (Artifact[] memory ret) {
        uint256[] memory tokens = DFTokenFacet(address(this)).tokensByAccount(player);
        uint256 numArtifacts = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (LibArtifact.isArtifact(tokens[i])) numArtifacts += 1;
        }

        ret = new Artifact[](numArtifacts);
        numArtifacts = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (LibArtifact.isArtifact(tokens[i]))
                ret[numArtifacts++] = LibArtifact.decode(tokens[i]);
        }
    }

    function getSilverTokenId() public pure returns (uint256 ret) {
        ret = LibSilver.create();
    }

    function getArtifactTokenId(
        ArtifactType artifactType,
        ArtifactRarity rarity,
        Biome biome
    ) public pure returns (uint256 ret) {
        ret = LibArtifact.create(rarity, artifactType, biome);
    }

    function getSpaceshipTokenId(SpaceshipType spaceship) public pure returns (uint256 ret) {
        ret = LibSpaceship.create(spaceship);
    }
}
