import { DarkForest } from '@dfdao/contracts/typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { createArena, defaultWorldFixture, World } from './utils/TestWorld';
import { arenaInitializers } from './utils/WorldConstants';

describe.only('DarkForestArena', function () {
  let world: World;
  let lobby: DarkForest;

  async function worldFixture() {
    const _world = await loadFixture(defaultWorldFixture);
    const _lobby = await createArena(_world.user1Core, arenaInitializers);
    return { _world, _lobby };
  }

  beforeEach('load fixture', async function () {
    const { _world, _lobby } = await loadFixture(worldFixture);
    world = _world;
    lobby = _lobby;
  });

  it('has arena constants', async function () {
    expect((await lobby.getGameConstants()).MANUAL_SPAWN).to.equal(true);
  });
});
