import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { defaultWorldFixture, World } from './utils/TestWorld';

describe('ERC1155', function () {
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);
    return world;
  }

  beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });
  it('has correct functions', async function () {
    // world.contract.mint();
    console.log(world.contract.address);
  });
});
