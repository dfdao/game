import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { makeInitArgs, makeRevealArgs } from './utils/TestUtils';
import { arenaWorldFixture, World } from './utils/TestWorld';
import {
  ADMIN_PLANET,
  ADMIN_PLANET_CLOAKED,
  LVL1_PLANET_SPACE,
  LVL2_PLANET_DEEP_SPACE,
  VALID_INIT_PERLIN,
} from './utils/WorldConstants';

describe.only('DarkForestArena', function () {
  let world: World;

  beforeEach('load fixture', async function () {
    world = await loadFixture(arenaWorldFixture);
  });

  describe('Create Planets', function () {
    it('has arena constants', async function () {
      expect((await world.contract.getGameConstants()).MANUAL_SPAWN).to.equal(true);
      expect((await world.contract.getGameConstants()).ADMIN_CAN_ADD_PLANETS).to.equal(true);
      expect((await world.contract.getGameConstants()).TARGETS_REQUIRED_FOR_VICTORY).to.equal(1);
    });
    it('allows admin to create a spawn planet', async function () {
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

      await world.contract.revealLocation(...makeRevealArgs(ADMIN_PLANET_CLOAKED, x, y));

      const numSpawnPlanets = await world.contract.getNSpawnPlanets();
      expect(numSpawnPlanets).to.equal(1);

      const spawnPlanet = await world.contract.spawnPlanetIds(0);

      expect(spawnPlanet).to.equal(ADMIN_PLANET_CLOAKED.id);
    });

    it('allows admin to create target planet', async function () {
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
        isTargetPlanet: true,
        isSpawnPlanet: false,
        blockedPlanetIds: [],
      });

      await world.contract.revealLocation(...makeRevealArgs(ADMIN_PLANET_CLOAKED, x, y));

      const numTargetPlanets = await world.contract.getNTargetPlanets();
      expect(numTargetPlanets).to.equal(1);

      const targetPlanetId = await world.contract.targetPlanetIds(0);
      expect(targetPlanetId).to.equal(ADMIN_PLANET_CLOAKED.id);

      const targetPlanet = await world.contract.planets(ADMIN_PLANET_CLOAKED.id);
      expect(targetPlanet.spawnPlanet).to.equal(false);
      expect(targetPlanet.targetPlanet).to.equal(true);
    });

    it('allows admin to bulk create planets', async function () {
      const perlin = 20;
      const level = 5;
      const planetType = 1; // asteroid field
      const x = 10;
      const y = 20;
      const planets = [
        {
          location: ADMIN_PLANET.id,
          x,
          y,
          perlin,
          level,
          planetType,
          requireValidLocationId: true,
          isTargetPlanet: false,
          isSpawnPlanet: false,
          blockedPlanetIds: [],
        },
        {
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
        },
        {
          location: LVL1_PLANET_SPACE.id,
          x,
          y,
          perlin,
          level,
          planetType,
          requireValidLocationId: true,
          isTargetPlanet: false,
          isSpawnPlanet: false,
          blockedPlanetIds: [],
        },
      ];
      await world.contract.bulkCreatePlanet(planets);

      await world.contract.revealLocation(...makeRevealArgs(ADMIN_PLANET, x, y));
      await world.contract.revealLocation(...makeRevealArgs(LVL1_PLANET_SPACE, 50, 100));

      const revealedCoords = await world.contract.revealedCoords(ADMIN_PLANET.id);
      expect(revealedCoords.x.toNumber()).to.equal(x);
      expect(revealedCoords.y.toNumber()).to.equal(y);

      const revealedCoords1 = await world.contract.revealedCoords(LVL1_PLANET_SPACE.id);
      expect(revealedCoords1.x.toNumber()).to.equal(50);
      expect(revealedCoords1.y.toNumber()).to.equal(100);

      expect((await world.contract.getNRevealedPlanets()).toNumber()).to.equal(2);
      expect(await world.contract.revealedPlanetIds(0)).to.be.equal(ADMIN_PLANET.id);
      expect(await world.contract.revealedPlanetIds(1)).to.be.equal(LVL1_PLANET_SPACE.id);
    });

    it('creates and reveals one planet', async function () {
      const perlin = 20;
      const level = 5;
      const planetType = 1; // asteroid field
      const x = 10;
      const y = 30;
      const createReveal = await world.contract.createAndReveal({
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

      const createRevealReceipt = await createReveal.wait();

      console.log(`createAndReveal used ${createRevealReceipt.gasUsed} gas`);

      const testPlanet = await world.contract.getRevealedCoords(ADMIN_PLANET_CLOAKED.id);

      expect(testPlanet.x).to.equal(x);
      expect(testPlanet.y).to.equal(y);
    });

    it('bulk creates and reveals multiple planets', async function () {
      const perlin = 20;
      const level = 5;
      const planetType = 1; // asteroid field
      const planets = [ADMIN_PLANET, ADMIN_PLANET_CLOAKED, LVL1_PLANET_SPACE];

      const planetArgList: any = [];

      planets.map((p) => {
        const planetArgs = {
          location: p.id,
          x: Math.floor(Math.random() * 100),
          y: Math.floor(Math.random() * 100),
          perlin,
          level,
          planetType,
          requireValidLocationId: false,
          isTargetPlanet: false,
          isSpawnPlanet: true,
          blockedPlanetIds: [],
        };

        planetArgList.push(planetArgs);
      });

      const tx = await world.contract.bulkCreateAndReveal(planetArgList);
      const rct = await tx.wait();
      console.log(`created and revealed ${planets.length} planets with ${rct.gasUsed} gas`);

      const data = await world.contract.bulkGetPlanetsDataByIds(planets.map((p) => p.id));

      for (let i = 0; i < planets.length; i++) {
        expect(data[i].revealedCoords.locationId).to.equal(planets[i].id);
        expect(data[i].revealedCoords.x).to.equal(planetArgList[i].x);
        expect(data[i].revealedCoords.y).to.equal(planetArgList[i].y);
        expect(data[i].planet.perlin).to.equal(planetArgList[i].perlin);
      }
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
  });
  describe('Target Planets', function () {
    it('creates a target planet', async function () {});
  });
});
