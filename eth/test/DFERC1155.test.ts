import { DFToken, DFToken__factory } from '@dfdao/contracts/typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * Once again, a friendly reminder that in ERC1155 tokenId refers to a collection of 1 or more
 * tokens, NOT guaranteed to be unique instances of tokens.
 */

describe('SolidStateERC1155', function () {
  let token: DFToken;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  const addressZero = ethers.constants.AddressZero;
  const collectionId = ethers.constants.Zero;
  const amount = ethers.constants.Two;
  const tokenURI = 'ERC1155Metadata.tokenURI/{id}.json';

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    token = await new DFToken__factory(deployer).deploy();
    user1 = signers[1];
  });

  it('mints tokens for tokenId zero', async function () {
    await expect(token.mint(user1.address, collectionId, amount, ethers.constants.HashZero))
      .to.emit(token, 'TransferSingle')
      .withArgs(deployer.address, addressZero, user1.address, collectionId, amount);

    await expect(
      token.connect(user1).mint(user1.address, collectionId, amount, ethers.constants.HashZero)
    )
      .to.emit(token, 'TransferSingle')
      .withArgs(user1.address, addressZero, user1.address, collectionId, amount);
    // Each mint created 2 tokens in the same collection. Two mints = 4 tokens.
    expect(await token.balanceOf(user1.address, collectionId)).to.equal(amount.mul(2));
  });
  it('sets tokenURI for tokenId zero', async function () {
    await expect(token.setTokenURI(collectionId, tokenURI))
      .to.emit(token, 'URI')
      .withArgs(tokenURI, collectionId);

    expect(await token.uri(collectionId)).to.equal(tokenURI);
  });
});
