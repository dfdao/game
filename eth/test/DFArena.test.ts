import { DarkForest } from '@dfdao/contracts/typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { makeInitArgs, makeRevealArgs } from './utils/TestUtils';
import { createArena, defaultWorldFixture, World } from './utils/TestWorld';
import { ADMIN_PLANET_CLOAKED, arenaInitializers } from './utils/WorldConstants';

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

  describe('basic functions', function () {
    it('has arena constants', async function () {
      expect((await lobby.getGameConstants()).MANUAL_SPAWN).to.equal(true);
      expect((await lobby.getGameConstants()).ADMIN_CAN_ADD_PLANETS).to.equal(true);
    });
  });

  describe('Planets', function () {
    beforeEach('connect lobby to user1', async function () {
      lobby = lobby.connect(world.user1);
    });
    it('allows admin to create a spawn planet and player to spawn', async function () {
      const perlin = 20;
      const level = 5;
      const planetType = 1; // asteroid field
      const x = 10;
      const y = 20;
      await lobby.createArenaPlanet({
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

      await lobby.revealLocation(...makeRevealArgs(ADMIN_PLANET_CLOAKED, x, y));

      const numSpawnPlanets = await lobby.getNSpawnPlanets();
      expect(numSpawnPlanets).to.equal(1);

      const spawnPlanet = await lobby.spawnPlanetIds(0);

      expect(spawnPlanet).to.equal(ADMIN_PLANET_CLOAKED.id);

      await expect(lobby.initializePlayer(...makeInitArgs(ADMIN_PLANET_CLOAKED)))
        .to.emit(lobby, 'PlayerInitialized')
        .withArgs(world.user1.address, ADMIN_PLANET_CLOAKED.id.toString());
    });
  });
});
