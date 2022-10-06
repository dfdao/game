import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { makeInitArgs, makeRevealArgs } from './utils/TestUtils';
import { arenaWorldFixture, World } from './utils/TestWorld';
import { ADMIN_PLANET_CLOAKED } from './utils/WorldConstants';

describe('DarkForestArena', function () {
  let world: World;

  beforeEach('load fixture', async function () {
    world = await loadFixture(arenaWorldFixture);
  });

  describe('basic functions', function () {
    it('has arena constants', async function () {
      expect((await world.contract.getGameConstants()).MANUAL_SPAWN).to.equal(true);
      expect((await world.contract.getGameConstants()).ADMIN_CAN_ADD_PLANETS).to.equal(true);
    });
  });

  describe('Manual Spawn', function () {
    it('allows admin to create a spawn planet and player to spawn', async function () {
      const perlin = 20;
      const level = 5;
      const planetType = 1; // asteroid field
      const x = 10;
      const y = 20;
      await world.contract.createArenaPlanet({
        location: ADMIN_PLANET_CLOAKED.id,
        x,
        y,
        perlin,
        level,
        planetType,
        requireValidLocationId: false,
        isTargetPlanet: false,
        isSpawnPlanet: true,
        blockedPlanetIds: [],
      });

      await world.user1Core.revealLocation(...makeRevealArgs(ADMIN_PLANET_CLOAKED, x, y));

      const numSpawnPlanets = await world.user1Core.getNSpawnPlanets();
      expect(numSpawnPlanets).to.equal(1);

      const spawnPlanet = await world.user1Core.spawnPlanetIds(0);

      expect(spawnPlanet).to.equal(ADMIN_PLANET_CLOAKED.id);

      await expect(world.user1Core.initializePlayer(...makeInitArgs(ADMIN_PLANET_CLOAKED)))
        .to.emit(world.user1Core, 'PlayerInitialized')
        .withArgs(world.user1.address, ADMIN_PLANET_CLOAKED.id.toString());
    });
  });
});
