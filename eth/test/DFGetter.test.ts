import { ArtifactType } from '@dfdao/types';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { createArtifact, increaseBlockchainTime, makeInitArgs } from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import { SPAWN_PLANET_1, ZERO_PLANET } from './utils/WorldConstants';

describe('DarkForestGetter', function () {
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);
    const initArgs = makeInitArgs(SPAWN_PLANET_1);
    await world.user1Core.initializePlayer(...initArgs);
    await world.user1Core.giveSpaceShips(SPAWN_PLANET_1.id);
    await increaseBlockchainTime();
    return world;
  }

  beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });

  describe.only('tokens', function () {
    it('gets spaceship tokens', async function () {
      expect((await world.contract.tokensByAccount(world.user1.address)).length).to.equal(5);
      expect((await world.contract.getPlayerSpaceships(world.user1.address)).length).to.equal(5);
    });
    it('gets artifact tokens', async function () {
      await createArtifact(world.contract, world.user1.address, ZERO_PLANET, ArtifactType.Colossus);
      expect((await world.contract.tokensByAccount(world.user1.address)).length).to.equal(6);
      expect((await world.contract.getPlayerArtifacts(world.user1.address)).length).to.equal(1);
    });
  });
});
