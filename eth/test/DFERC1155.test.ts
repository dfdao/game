import { DFToken, DFToken__factory } from '@dfdao/contracts/typechain';
import { ethers } from 'hardhat';

const tokenURI = 'ERC1155Metadata.tokenURI';

describe('SolidStateERC1155', function () {
  let token: DFToken;

  beforeEach(async function () {
    const [deployer] = await ethers.getSigners();
    token = await new DFToken__factory(deployer).deploy();
  });

  it('mints', async function () {
    console.log('not yet!');
  });
});
