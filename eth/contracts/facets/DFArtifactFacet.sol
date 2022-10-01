// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Contract imports
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";
import {DFVerifierFacet} from "./DFVerifierFacet.sol";
import {DFWhitelistFacet} from "./DFWhitelistFacet.sol";

// Library Imports
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibGameUtils} from "../libraries/LibGameUtils.sol";
import {LibArtifactUtils} from "../libraries/LibArtifactUtils.sol";
import {LibArtifact} from "../libraries/LibArtifact.sol";
import {LibSpaceship} from "../libraries/LibSpaceship.sol";

import {LibPlanet} from "../libraries/LibPlanet.sol";

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";

// Type imports
import {Artifact, ArtifactRarity, ArtifactType, Biome, TokenType, DFTCreateArtifactArgs, DFPFindArtifactArgs, Spaceship, SpaceshipType} from "../DFTypes.sol";

import "hardhat/console.sol";

contract DFArtifactFacet is WithStorage, SolidStateERC1155 {
    event PlanetProspected(address player, uint256 loc);
    event ArtifactFound(address player, uint256 artifactId, uint256 loc);
    event ArtifactDeposited(address player, uint256 artifactId, uint256 loc);
    event ArtifactWithdrawn(address player, uint256 artifactId, uint256 loc);
    event ArtifactActivated(address player, uint256 artifactId, uint256 loc); // also emitted in LibPlanet
    event ArtifactDeactivated(address player, uint256 artifactId, uint256 loc); // also emitted in LibPlanet

    modifier onlyWhitelisted() {
        require(
            DFWhitelistFacet(address(this)).isWhitelisted(msg.sender) ||
                msg.sender == LibPermissions.contractOwner(),
            "Player is not whitelisted"
        );
        _;
    }

    modifier notPaused() {
        require(!gs().paused, "Game is paused");
        _;
    }

    modifier notTokenEnded() {
        require(block.timestamp < gs().TOKEN_MINT_END_TIMESTAMP, "Token mint period has ended");
        _;
    }

    modifier onlyAdminOrCore() {
        require(
            msg.sender == gs().diamondAddress || msg.sender == LibPermissions.contractOwner(),
            "Only the Core or Admin addresses can fiddle with artifacts."
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == LibPermissions.contractOwner(),
            "Only Admin address can perform this action."
        );
        _;
    }

    function createArtifact(uint256 tokenId, address owner)
        public
        onlyAdminOrCore
        returns (Artifact memory)
    {
        require(tokenId >= 1, "token id must be positive");
        require(LibArtifact.isArtifact(tokenId), "token must be Artifact");
        // Account, Id, Amount, Data
        _mint(owner, tokenId, 1, "");

        return LibArtifact.decode(tokenId);
    }

    function createSpaceship(uint256 tokenId, address owner)
        public
        onlyAdminOrCore
        returns (Spaceship memory)
    {
        require(tokenId >= 1, "token id must be positive");
        require(LibSpaceship.isShip(tokenId), "token must be Spaceship");

        // Account, Id, Amount, Data
        _mint(owner, tokenId, 1, "");

        return getSpaceship(tokenId);
    }

    function getSpaceship(uint256 shipId) public pure returns (Spaceship memory) {
        return LibSpaceship.decode(shipId);
    }

    function encodeSpaceship(Spaceship memory spaceship) public pure returns (uint256) {
        return LibSpaceship.encode(spaceship);
    }

    function decodeSpaceship(uint256 shipId) public pure returns (Spaceship memory) {
        return LibSpaceship.decode(shipId);
    }

    function encodeArtifact(Artifact memory artifact) public pure returns (uint256) {
        return LibArtifact.encode(artifact);
    }

    function decodeArtifact(uint256 artifactId) public pure returns (Artifact memory) {
        return LibArtifact.decode(artifactId);
    }

    // This calls the low level _transfer call which doesn't check if the msg.sender actually owns
    // the tokenId. TODO: See if this is a problem.
    function transferArtifact(
        uint256 tokenId,
        address owner,
        address newOwner
    ) public onlyAdminOrCore {
        if (newOwner == address(0)) {
            // account, id, amount.
            _burn(owner, tokenId, 1);
        } else {
            // sender receiver id amount data
            _transfer(owner, owner, newOwner, tokenId, 1, "");
        }
    }

    function tokenExists(address owner, uint256 tokenId) public view returns (bool) {
        return balanceOf(owner, tokenId) > 0;
    }

    function findArtifact(
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[7] memory _input
    ) public notPaused notTokenEnded {
        uint256 planetId = _input[0];
        uint256 biomebase = _input[1];

        LibGameUtils.revertIfBadSnarkPerlinFlags(
            [_input[2], _input[3], _input[4], _input[5], _input[6]],
            true
        );

        LibPlanet.refreshPlanet(planetId);

        if (!snarkConstants().DISABLE_ZK_CHECKS) {
            require(
                DFVerifierFacet(address(this)).verifyBiomebaseProof(_a, _b, _c, _input),
                "biome zkSNARK failed doesn't check out"
            );
        }

        uint256 foundArtifactId = LibArtifactUtils.findArtifact(
            DFPFindArtifactArgs(planetId, biomebase, address(this))
        );

        emit ArtifactFound(msg.sender, foundArtifactId, planetId);
    }

    function depositArtifact(uint256 locationId, uint256 artifactId) public notPaused {
        // should this be implemented as logic that is triggered when a player sends
        // an artifact to the contract with locationId in the extra data?
        // might be better use of the ERC721 standard - can use safeTransfer then
        LibPlanet.refreshPlanet(locationId);

        LibArtifactUtils.depositArtifact(locationId, artifactId, address(this));

        emit ArtifactDeposited(msg.sender, locationId, artifactId);
    }

    // withdraws the given artifact from the given planet. you must own the planet,
    // the artifact must be on the given planet
    function withdrawArtifact(uint256 locationId, uint256 artifactId) public notPaused {
        LibPlanet.refreshPlanet(locationId);

        LibArtifactUtils.withdrawArtifact(locationId, artifactId);

        emit ArtifactWithdrawn(msg.sender, locationId, artifactId);
    }

    // activates the given artifact on the given planet. the artifact must have
    // been previously deposited on this planet. the artifact cannot be activated
    // within a certain cooldown period, depending on the artifact type
    function activateArtifact(
        uint256 locationId,
        uint256 artifactId,
        uint256 wormholeTo
    ) public notPaused {
        LibPlanet.refreshPlanet(locationId);

        if (wormholeTo != 0) {
            LibPlanet.refreshPlanet(wormholeTo);
        }

        LibArtifactUtils.activateArtifact(locationId, artifactId, wormholeTo);
        // event is emitted in the above library function
    }

    // if there's an activated artifact on this planet, deactivates it. otherwise reverts.
    // deactivating an artifact this debuffs the planet, and also removes whatever special
    // effect that the artifact bestowned upon this planet.
    function deactivateArtifact(uint256 locationId) public notPaused {
        LibPlanet.refreshPlanet(locationId);

        LibArtifactUtils.deactivateArtifact(locationId);
        // event is emitted in the above library function
    }

    // in order to be able to find an artifact on a planet, the planet
    // must first be 'prospected'. prospecting commits to a currently-unknown
    // seed that is used to randomly generate the artifact that will be
    // found on this planet.
    function prospectPlanet(uint256 locationId) public notPaused {
        LibPlanet.refreshPlanet(locationId);
        LibArtifactUtils.prospectPlanet(locationId);
        emit PlanetProspected(msg.sender, locationId);
    }

    /**
      Gives players 5 spaceships on their home planet. Can only be called once
      by a given player. This is a first pass at getting spaceships into the game.
      Eventually ships will be able to spawn in the game naturally (construction, capturing, etc.)
     */
    function giveSpaceShips(uint256 locationId) public onlyWhitelisted {
        require(!gs().players[msg.sender].claimedShips, "player already claimed ships");
        require(
            gs().planets[locationId].owner == msg.sender && gs().planets[locationId].isHomePlanet,
            "you can only spawn ships on your home planet"
        );

        address owner = gs().planets[locationId].owner;
        if (gameConstants().SPACESHIPS.MOTHERSHIP) {
            uint256 id1 = LibArtifactUtils.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipMothership
            );
            emit ArtifactFound(msg.sender, id1, locationId);
        }

        if (gameConstants().SPACESHIPS.CRESCENT) {
            uint256 id2 = LibArtifactUtils.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipCrescent
            );
            emit ArtifactFound(msg.sender, id2, locationId);
        }

        if (gameConstants().SPACESHIPS.WHALE) {
            uint256 id3 = LibArtifactUtils.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipWhale
            );
            emit ArtifactFound(msg.sender, id3, locationId);
        }

        if (gameConstants().SPACESHIPS.GEAR) {
            uint256 id4 = LibArtifactUtils.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipGear
            );
            emit ArtifactFound(msg.sender, id4, locationId);
        }

        if (gameConstants().SPACESHIPS.TITAN) {
            uint256 id5 = LibArtifactUtils.createAndPlaceSpaceship(
                locationId,
                owner,
                SpaceshipType.ShipTitan
            );

            emit ArtifactFound(msg.sender, id5, locationId);
        }

        gs().players[msg.sender].claimedShips = true;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        uint256 length = ids.length;
        for (uint256 i = 0; i < length; i++) {
            // Only core contract can transfer Spaceships
            if (LibSpaceship.isShip(ids[i])) {
                require(msg.sender == gs().diamondAddress, "player cannot transfer a Spaceship");
            }
        }
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
     * @notice ERC1155 mint
     * @param owner of new tokens
     * @param tokenId tokenId to mint
     * @param amount amount of tokens to mint
     */
    function mint(
        address owner,
        uint256 tokenId,
        uint256 amount
    ) public onlyAdminOrCore {
        _mint(owner, tokenId, amount, "");
    }
}
