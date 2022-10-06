import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { makeInitArgs, makeRevealArgs } from './utils/TestUtils';
import { arenaWorldFixture, World } from './utils/TestWorld';
import {
  ADMIN_PLANET_CLOAKED,
  LVL2_PLANET_DEEP_SPACE,
  VALID_INIT_PERLIN,
} from './utils/WorldConstants';

describe.only('DarkForestArena', function () {
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
    it('reverts if planet not initialized as a spawn planet', async function () {
      await expect(
        world.user1Core.initializePlayer(...makeInitArgs(ADMIN_PLANET_CLOAKED))
      ).to.be.revertedWith('Planet is not a spawn planet');
    });

    it('reverts if spawn planet already initialized', async function () {
      const perlin = VALID_INIT_PERLIN;
      const level = 0;
      const planetType = 0; // planet
      await world.contract.createArenaPlanet({
        location: ADMIN_PLANET_CLOAKED.id,
        x: 10,
        y: 10,
        perlin,
        level,
        planetType,
        requireValidLocationId: false,
        isTargetPlanet: false,
        isSpawnPlanet: true,
        blockedPlanetIds: [],
      });

      const toPlanetExtended = await world.contract.planets(ADMIN_PLANET_CLOAKED.id);
      expect(toPlanetExtended.isInitialized).to.equal(true);

      await expect(world.user1Core.initializePlayer(...makeInitArgs(ADMIN_PLANET_CLOAKED)))
        .to.emit(world.contract, 'PlayerInitialized')
        .withArgs(world.user1.address, ADMIN_PLANET_CLOAKED.id.toString());

      await expect(
        world.user2Core.initializePlayer(...makeInitArgs(ADMIN_PLANET_CLOAKED))
      ).to.be.revertedWith('Planet is owned');
    });

    it('allows player to spawn at admin planet that is initialized', async function () {
      const perlin = VALID_INIT_PERLIN;
      const level = 0;
      const planetType = 0; // planet
      await world.contract.createArenaPlanet({
        location: ADMIN_PLANET_CLOAKED.id,
        x: 10,
        y: 10,
        perlin,
        level,
        planetType,
        requireValidLocationId: false,
        isTargetPlanet: false,
        isSpawnPlanet: true,
        blockedPlanetIds: [],
      });

      const toPlanetExtended = await world.contract.planets(ADMIN_PLANET_CLOAKED.id);
      expect(toPlanetExtended.isInitialized).to.equal(true);

      await expect(world.user1Core.initializePlayer(...makeInitArgs(ADMIN_PLANET_CLOAKED)))
        .to.emit(world.contract, 'PlayerInitialized')
        .withArgs(world.user1.address, ADMIN_PLANET_CLOAKED.id.toString());
    });

    it('gets false for a planet that is neither spawn nor target planet', async function () {
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
        isSpawnPlanet: false,
        blockedPlanetIds: [],
      });

      await world.contract.revealLocation(...makeRevealArgs(ADMIN_PLANET_CLOAKED, x, y));

      const numSpawnPlanets = await world.contract.getNSpawnPlanets();
      expect(numSpawnPlanets).to.equal(0);

      const spawnPlanet = await world.contract.planets(ADMIN_PLANET_CLOAKED.id);

      expect(spawnPlanet.spawnPlanet).to.equal(false);
      expect(spawnPlanet.targetPlanet).to.equal(false);
    });

    it('sets the planet to the proper values', async function () {
      const perlin = 16;
      const level = 2;
      const planetType = 0; // planet
      const x = 10;
      const y = 20;
      await world.contract.createArenaPlanet({
        location: LVL2_PLANET_DEEP_SPACE.id,
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

      await world.contract.revealLocation(...makeRevealArgs(LVL2_PLANET_DEEP_SPACE, x, y));

      const numSpawnPlanets = await world.contract.getNSpawnPlanets();
      expect(numSpawnPlanets).to.equal(1);

      await world.user1Core.initializePlayer(...makeInitArgs(LVL2_PLANET_DEEP_SPACE));

      const spawnPlanetInfo = await world.contract.planets(LVL2_PLANET_DEEP_SPACE.id);
      const spawnPlanetArenaInfo = await world.contract.planets(LVL2_PLANET_DEEP_SPACE.id);

      const popCap = spawnPlanetInfo.populationCap.toNumber();

      expect(spawnPlanetArenaInfo.spawnPlanet).to.be.equal(true);
      expect(spawnPlanetInfo.isHomePlanet).to.be.equal(true);
      expect(spawnPlanetInfo.owner).to.be.equal(world.user1.address);
      expect(spawnPlanetInfo.population.toNumber()).to.be.approximately(
        Math.floor(popCap * 0.99),
        10
      );
    });

    it('reverts if target planet is made', async function () {
      const perlin = VALID_INIT_PERLIN;
      const level = 0;
      const planetType = 0; // planet
      await expect(
        world.contract.createArenaPlanet({
          location: ADMIN_PLANET_CLOAKED.id,
          x: 10,
          y: 20,
          perlin,
          level,
          planetType,
          requireValidLocationId: false,
          isTargetPlanet: true,
          isSpawnPlanet: false,
          blockedPlanetIds: [],
        })
      ).to.be.revertedWith('admin cannot create target planets');
    });
  });
});
