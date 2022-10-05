import { PlanetType, SpaceshipType } from '@dfdao/types';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import {
  conquerUnownedPlanet,
  getSpaceshipOnPlanetByType,
  increaseBlockchainTime,
  makeInitArgs,
  makeMoveArgs,
} from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import {
  LVL1_ASTEROID_1,
  LVL1_PLANET_DEEP_SPACE,
  LVL2_PLANET_SPACE,
  SPAWN_PLANET_1,
  SPAWN_PLANET_2,
} from './utils/WorldConstants';

describe('DarkForestSpaceShips', function () {
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);
    let initArgs = makeInitArgs(SPAWN_PLANET_1);
    await world.user1Core.initializePlayer(...initArgs);
    await world.user1Core.giveSpaceShips(SPAWN_PLANET_1.id);
    await increaseBlockchainTime();

    initArgs = makeInitArgs(SPAWN_PLANET_2);
    await world.user2Core.initializePlayer(...initArgs);
    await increaseBlockchainTime();

    return world;
  }

  beforeEach(async function () {
    world = await loadFixture(worldFixture);
  });

  describe('spawning your ships', function () {
    it('gives you 5 space ships', async function () {
      expect((await world.user1Core.getSpaceshipsOnPlanet(SPAWN_PLANET_1.id)).length).to.be.equal(
        5
      );
    });

    it('can only be done once per player', async function () {
      await expect(world.user1Core.giveSpaceShips(SPAWN_PLANET_1.id)).to.be.revertedWith(
        'player already claimed ships'
      );
    });

    describe('spawning on planet you do not own', async function () {
      it('reverts', async function () {
        await expect(world.user2Core.giveSpaceShips(LVL2_PLANET_SPACE.id)).to.be.revertedWith(
          'you can only spawn ships on your home planet'
        );
      });
    });
  });

  describe('ship transfers', function () {
    it('cannot transfer your own spaceship', async function () {
      const motherShip = await getSpaceshipOnPlanetByType(
        world.contract,
        SPAWN_PLANET_1.id,
        SpaceshipType.ShipMothership
      );
      // Player owns ship.
      expect(await world.contract.balanceOf(world.user1.address, motherShip.id)).to.equal(1);
      await expect(
        world.user1Core.safeTransferFrom(
          world.user1.address,
          world.user2.address,
          motherShip.id,
          1,
          '0x00'
        )
      ).to.be.revertedWith('player cannot transfer a Spaceship');
    });
    it('cannot transfer other players spaceship', async function () {
      await world.user2Core.giveSpaceShips(SPAWN_PLANET_2.id);

      const motherShip = await getSpaceshipOnPlanetByType(
        world.contract,
        SPAWN_PLANET_2.id,
        SpaceshipType.ShipMothership
      );
      // Other Player owns ship.
      expect(await world.contract.balanceOf(world.user2.address, motherShip.id)).to.equal(1);
      await expect(
        world.user1Core.safeTransferFrom(
          world.user2.address,
          world.user1.address,
          motherShip.id,
          1,
          '0x00'
        )
      ).to.be.revertedWith('ERC1155: caller is not owner nor approved');
    });
  });

  describe('using the Titan', async function () {
    this.timeout(0);

    it('pauses energy regeneration on planets', async function () {
      const titan = await getSpaceshipOnPlanetByType(
        world.contract,
        SPAWN_PLANET_1.id,
        SpaceshipType.ShipTitan
      );

      // Move Titan to planet
      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, LVL1_ASTEROID_1, 1000, 0, 0, titan?.id)
      );
      await increaseBlockchainTime();

      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_1);

      const previousPlanet = await world.contract.planets(LVL1_ASTEROID_1.id);
      const sendingPopulation = 50000;

      // Move energy off of planet and wait
      await world.user1Core.move(
        ...makeMoveArgs(LVL1_ASTEROID_1, SPAWN_PLANET_1, 100, sendingPopulation, 0)
      );
      await increaseBlockchainTime();

      const currentPlanetPopulation = (await world.contract.planets(LVL1_ASTEROID_1.id)).population;
      const expectedPopulation = previousPlanet.population.sub(sendingPopulation);
      // Population did not grow
      await world.contract.refreshPlanet(LVL1_ASTEROID_1.id);
      expect(currentPlanetPopulation).to.be.equal(expectedPopulation);

      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_PLANET_DEEP_SPACE);
      await increaseBlockchainTime();

      // DUMP energy onto the Titan-ed planet
      for (let i = 0; i < 30; i++) {
        await world.user1Core.move(
          ...makeMoveArgs(LVL1_PLANET_DEEP_SPACE, LVL1_ASTEROID_1, 100, 60_000, 0)
        );
        await increaseBlockchainTime();
      }

      // It should not overflow
      await world.contract.refreshPlanet(LVL1_ASTEROID_1.id);
      const currentPlanet = await world.contract.planets(LVL1_ASTEROID_1.id);
      expect(currentPlanet.population).to.be.equal(currentPlanet.populationCap);
    });
  });

  describe('using the Crescent', function () {
    it('turns planet into an asteroid and burns crescent', async function () {
      const crescent = await getSpaceshipOnPlanetByType(
        world.contract,
        SPAWN_PLANET_1.id,
        SpaceshipType.ShipCrescent
      );

      // Move Crescent to planet
      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, LVL1_PLANET_DEEP_SPACE, 1000, 0, 0, crescent.id)
      );

      await increaseBlockchainTime();
      await world.contract.refreshPlanet(LVL1_PLANET_DEEP_SPACE.id);

      const crescentNewLocId = (
        await world.contract.getSpaceshipsOnPlanet(LVL1_PLANET_DEEP_SPACE.id)
      )[0].id;
      expect(crescentNewLocId).to.equal(crescent?.id);

      const planetBeforeActivate = await world.contract.planets(LVL1_PLANET_DEEP_SPACE.id);
      await world.user1Core.activateArtifact(LVL1_PLANET_DEEP_SPACE.id, crescent.id, 0);
      const planetAfterActivate = await world.contract.planets(LVL1_PLANET_DEEP_SPACE.id);
      // Silver is higher
      expect(planetBeforeActivate.silverGrowth).to.be.lessThan(planetAfterActivate.silverGrowth);
      // Crescent is no longer on planet.
      expect(
        (await world.contract.getSpaceshipsOnPlanet(LVL1_PLANET_DEEP_SPACE.id)).length
      ).to.equal(0);
      // Planet was planet
      expect(planetBeforeActivate.planetType).to.equal(PlanetType.PLANET);
      // Planet is now asteroid.
      expect(planetAfterActivate.planetType).to.equal(PlanetType.SILVER_MINE);
      // Cannot activate again.
      await expect(
        world.user1Core.activateArtifact(LVL1_PLANET_DEEP_SPACE.id, crescent.id, 0)
      ).to.be.revertedWith("can't activate a ship on a planet it's not on");
    });
  });

  describe('spawning on non-home planet', async function () {
    it('reverts', async function () {
      await expect(world.user2Core.giveSpaceShips(LVL2_PLANET_SPACE.id)).to.be.revertedWith(
        'you can only spawn ships on your home planet'
      );
    });
  });
  describe('capturing unowned planet', async function () {
    it('send ship but wont capture', async function () {
      const mothership = await getSpaceshipOnPlanetByType(
        world.contract,
        SPAWN_PLANET_1.id,
        SpaceshipType.ShipMothership
      );
      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, LVL1_ASTEROID_1, 100, 0, 0, mothership.id)
      );
      await increaseBlockchainTime();
      await world.contract.refreshPlanet(LVL1_ASTEROID_1.id);

      // Ship move doesn't capture planet but does send Mothership to it.
      expect((await world.contract.planets(LVL1_ASTEROID_1.id)).owner).to.not.equal(
        world.user1.address
      );
      const mothershipAfterMove = await getSpaceshipOnPlanetByType(
        world.contract,
        LVL1_ASTEROID_1.id,
        SpaceshipType.ShipMothership
      );
      expect(mothershipAfterMove.id).to.equal(mothership.id);
    });
  });
});
