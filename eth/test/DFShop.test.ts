import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { makeInitArgs } from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import { SPAWN_PLANET_1, SPAWN_PLANET_2 } from './utils/WorldConstants';

describe('DarkForestShop', async function () {
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);

    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    await world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));

    const silverToken = await world.contract.getSilverTokenId();

    await world.contract.mint(world.user1.address, silverToken, 10000);
    return world;
  }

  this.beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });

  it('Mints the proper number of tokens for player1', async function () {
    const user1SilverBalance = await world.contract.getSilverBalance(world.user1.address);
    expect(user1SilverBalance).to.equal(10000);
  });
});
