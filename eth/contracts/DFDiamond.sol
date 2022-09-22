// SPDX-License-Identifier: GPL-3.0

/** Copy-paste from SolidStateDiamond:
 * https://github.com/solidstate-network/solidstate-solidity/blob/690f3058c614961227b27f342b43996336dc239d/contracts/proxy/diamond/SolidStateDiamond.sol
 *
 * Changed from using SafeOwnable to just Ownable for our needs.
 */
pragma solidity ^0.8.0;

import {Ownable, OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";
import {IERC173} from "@solidstate/contracts/access/IERC173.sol";
import {ERC165, IERC165, ERC165Storage} from "@solidstate/contracts/introspection/ERC165.sol";
import {DiamondBase, DiamondBaseStorage} from "@solidstate/contracts/proxy/diamond/base/DiamondBase.sol";
import {DiamondReadable, IDiamondReadable} from "@solidstate/contracts/proxy/diamond/readable/DiamondReadable.sol";
import {DiamondWritable, IDiamondWritable} from "@solidstate/contracts/proxy/diamond/writable/DiamondWritable.sol";
import {IERC721} from "@solidstate/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@solidstate/contracts/token/ERC721/metadata/IERC721Metadata.sol";
import {IERC721Enumerable} from "@solidstate/contracts/token/ERC721/enumerable/IERC721Enumerable.sol";

/**
 * @title SolidState "Diamond" proxy reference implementation
 */
contract DFDiamond is DiamondBase, DiamondReadable, DiamondWritable, Ownable, ERC165 {
    using DiamondBaseStorage for DiamondBaseStorage.Layout;
    using ERC165Storage for ERC165Storage.Layout;
    using OwnableStorage for OwnableStorage.Layout;

    constructor() {
        ERC165Storage.Layout storage erc165 = ERC165Storage.layout();
        bytes4[] memory selectors = new bytes4[](10);

        // register DiamondWritable

        selectors[0] = IDiamondWritable.diamondCut.selector;

        erc165.setSupportedInterface(type(IDiamondWritable).interfaceId, true);

        // register DiamondReadable

        selectors[1] = IDiamondReadable.facets.selector;
        selectors[2] = IDiamondReadable.facetFunctionSelectors.selector;
        selectors[3] = IDiamondReadable.facetAddresses.selector;
        selectors[4] = IDiamondReadable.facetAddress.selector;

        erc165.setSupportedInterface(type(IDiamondReadable).interfaceId, true);

        // register ERC165

        selectors[5] = IERC165.supportsInterface.selector;

        erc165.setSupportedInterface(type(IERC165).interfaceId, true);

        // register Ownable

        selectors[6] = IERC173.owner.selector;
        selectors[7] = IERC173.transferOwnership.selector;

        erc165.setSupportedInterface(type(IERC173).interfaceId, true);

        // Store ERC721 interface
        erc165.setSupportedInterface(type(IERC721).interfaceId, true);
        erc165.setSupportedInterface(type(IERC721Metadata).interfaceId, true);
        erc165.setSupportedInterface(type(IERC721Enumerable).interfaceId, true);

        // register Diamond

        selectors[8] = DFDiamond.getFallbackAddress.selector;
        selectors[9] = DFDiamond.setFallbackAddress.selector;

        // diamond cut

        FacetCut[] memory facetCuts = new FacetCut[](1);

        facetCuts[0] = FacetCut({
            target: address(this),
            action: IDiamondWritable.FacetCutAction.ADD,
            selectors: selectors
        });

        DiamondBaseStorage.layout().diamondCut(facetCuts, address(0), "");

        // set owner

        OwnableStorage.layout().setOwner(msg.sender);
    }

    receive() external payable {}

    /**
     * @notice get the address of the fallback contract
     * @return fallback address
     */
    function getFallbackAddress() external view returns (address) {
        return DiamondBaseStorage.layout().fallbackAddress;
    }

    /**
     * @notice set the address of the fallback contract
     * @param fallbackAddress fallback address
     */
    function setFallbackAddress(address fallbackAddress) external onlyOwner {
        DiamondBaseStorage.layout().fallbackAddress = fallbackAddress;
    }
}
