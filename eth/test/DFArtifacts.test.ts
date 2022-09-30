import { ArtifactRarity, ArtifactType, Biome, SpaceshipType, TokenType } from '@dfdao/types';
import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';
import { TestLocation } from './utils/TestLocation';
import {
  activateAndConfirm,
  conquerUnownedPlanet,
  createArtifact,
  getArtifactsOnPlanet,
  getArtifactsOwnedBy,
  getCurrentTime,
  getStatSum,
  increaseBlockchainTime,
  makeFindArtifactArgs,
  makeInitArgs,
  makeMoveArgs,
  prettyPrintToken,
  testDeactivate,
  user1MintArtifactPlanet,
} from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import {
  ARTIFACT_PLANET_1,
  LVL0_PLANET,
  LVL0_PLANET_DEAD_SPACE,
  LVL3_SPACETIME_1,
  LVL3_SPACETIME_2,
  LVL3_SPACETIME_3,
  LVL3_UNOWNED_NEBULA,
  LVL4_UNOWNED_DEEP_SPACE,
  LVL6_SPACETIME,
  SPACE_PERLIN,
  SPAWN_PLANET_1,
  SPAWN_PLANET_2,
  ZERO_PLANET,
} from './utils/WorldConstants';

describe('DarkForestArtifacts', function () {
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);

    // Initialize player
    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    await world.user1Core.giveSpaceShips(SPAWN_PLANET_1.id);
    await world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));

    // Conquer initial planets
    //// Player 1
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, ARTIFACT_PLANET_1);
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL3_SPACETIME_1);
    //// Player 2
    await conquerUnownedPlanet(world, world.user2Core, SPAWN_PLANET_2, LVL3_SPACETIME_2);
    await increaseBlockchainTime();

    // Move the Gear ship into position
    const gearShip = (await world.user1Core.getSpaceshipsOnPlanet(SPAWN_PLANET_1.id)).find(
      (ship) => ship.spaceshipType === SpaceshipType.ShipGear
    );

    const gearId = gearShip?.id;
    await world.user1Core.move(
      ...makeMoveArgs(SPAWN_PLANET_1, ARTIFACT_PLANET_1, 100, 0, 0, gearId)
    );
    await increaseBlockchainTime();
    const tx = await world.user1Core.refreshPlanet(ARTIFACT_PLANET_1.id);
    await tx.wait();

    // Conquer another planet for artifact storage
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL0_PLANET_DEAD_SPACE);

    return world;
  }

  beforeEach('load fixture', async function () {
    console.log(`loading world...`);
    this.timeout(0);
    world = await loadFixture(worldFixture);
  });

  describe('it tests basic artifact actions', function () {
    it('logs bits for artifact old', async function () {
      // Must be valid options
      const _collectionType = '0x01';
      const _rarity = ArtifactRarity.Legendary;
      const _artifactType = ArtifactType.Colossus;
      const _biome = Biome.DESERT;
      const res = await world.contract.encodeArtifact(
        _collectionType,
        _rarity,
        _artifactType,
        _biome
      );
      const { tokenType, rarity, planetBiome, artifactType } = await world.contract.getArtifact(
        res
      );
      expect(tokenType).to.equal(Number(_collectionType));
      expect(rarity).to.equal(Number(_rarity));
      expect(planetBiome).to.equal(Number(_biome));
      expect(artifactType).to.equal(Number(_artifactType));
    });
    it('encodes and decodes artifact', async function () {
      // Must be valid options
      const tokenType = TokenType.Artifact;
      const rarity = ArtifactRarity.Legendary;
      const artifactType = ArtifactType.Colossus;
      const planetBiome = Biome.DESERT;
      const res = await world.contract.testEncodeArtifact({
        id: 0,
        tokenType,
        rarity,
        artifactType,
        planetBiome,
      });
      const a = await world.contract.getArtifact(res);
      expect(tokenType).to.equal(Number(a.tokenType));
      expect(rarity).to.equal(Number(a.rarity));
      expect(artifactType).to.equal(Number(a.artifactType));
      expect(planetBiome).to.equal(Number(a.planetBiome));
    });
    it('encodes and decodes spaceship', async function () {
      // Must be valid options
      const tokenType = TokenType.Spaceship;
      const spaceshipType = 2;
      const res = await world.contract.testEncodeSpaceship({
        id: 0,
        tokenType,
        spaceshipType,
      });
      const a = await world.contract.testDecodeSpaceship(res);
      console.log(a);
      expect(tokenType).to.equal(Number(a.tokenType));
      expect(spaceshipType).to.equal(Number(a.spaceshipType));
    });
    // This test will fail if the artifact is special.
    it('be able to mint artifact on ruins, activate/buff, deactivate/debuff', async function () {
      const statSumInitial = getStatSum(await world.contract.planets(ARTIFACT_PLANET_1.id));

      const artifactId = await createArtifact(
        world.contract,
        world.user1.address,
        ARTIFACT_PLANET_1,
        ArtifactType.Colossus
      );

      const statSumAfterFound = getStatSum(await world.contract.planets(ARTIFACT_PLANET_1.id));

      await world.user1Core.activateArtifact(ARTIFACT_PLANET_1.id, artifactId, 0);

      prettyPrintToken(await world.user1Core.getArtifact(artifactId));

      // artifact and gear should be on planet. Gear is 0 and Artifact is 1.
      const artifactsOnPlanet = await getArtifactsOnPlanet(world, ARTIFACT_PLANET_1.id);
      expect(artifactsOnPlanet.length).to.be.equal(1);

      // artifact should be owned by contract
      artifactsOnPlanet.map(async (a) => {
        expect(await world.contract.balanceOf(world.contract.address, a.id)).to.equal(1);
      });

      // planet should be buffed after discovered artifact
      const activeArtifact = await world.user1Core.getActiveArtifactOnPlanet(ARTIFACT_PLANET_1.id);
      prettyPrintToken(activeArtifact);

      const statSumAfterActivation = getStatSum(await world.contract.planets(ARTIFACT_PLANET_1.id));

      // planet buff should be removed after artifact deactivated
      await world.user1Core.deactivateArtifact(ARTIFACT_PLANET_1.id);
      const statSumAfterDeactivate = getStatSum(await world.contract.planets(ARTIFACT_PLANET_1.id));

      expect(statSumAfterActivation).to.not.be.within(statSumInitial - 5, statSumInitial + 5);
      expect(statSumAfterActivation).to.not.be.within(
        statSumAfterDeactivate - 5,
        statSumAfterDeactivate + 5
      );
      expect(statSumAfterDeactivate).to.be.within(statSumInitial - 5, statSumInitial + 5);
      expect(statSumAfterFound).to.be.within(statSumInitial - 5, statSumInitial + 5);
    });

    it('cannot prospect multiple times, cannot find artifact more than 256 blocks after prospecting', async function () {
      await world.user1Core.prospectPlanet(ARTIFACT_PLANET_1.id);

      await expect(world.user1Core.prospectPlanet(ARTIFACT_PLANET_1.id)).to.be.revertedWith(
        'this planet has already been prospected'
      );

      await mine(256);

      await expect(
        world.user1Core.findArtifact(...makeFindArtifactArgs(ARTIFACT_PLANET_1))
      ).to.be.revertedWith('planet prospect expired');
    });

    it('should return a correct token uri for a minted artifact', async function () {
      await world.user1Core.prospectPlanet(ARTIFACT_PLANET_1.id);
      await increaseBlockchainTime();
      await world.user1Core.findArtifact(...makeFindArtifactArgs(ARTIFACT_PLANET_1));

      const artifactsOnPlanet = await world.contract.planetArtifacts(ARTIFACT_PLANET_1.id);
      const tokenUri = await world.contract.uri(artifactsOnPlanet[0]);

      const networkId = hre.network.config.chainId;
      const contractAddress = world.contract.address;

      expect(tokenUri).to.eq(
        `https://nft-test.zkga.me/token-uri/artifact/${networkId}-${contractAddress}/` +
          artifactsOnPlanet[0]
      );
    });

    it("should not be able to deposit an artifact you don't own", async function () {
      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      // user1 moves artifact and withdraws
      await world.user1Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, LVL3_SPACETIME_1, 0, 50000, 0, newArtifactId)
      );

      world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, newArtifactId);

      // user2 should not be able to deposit artifact
      await expect(
        world.user2Core.depositArtifact(LVL3_SPACETIME_2.id, newArtifactId)
      ).to.be.revertedWith('you can only deposit artifacts you own');
    });

    it('should be able to move an artifact from a planet you own', async function () {
      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      let artifactsOnRuins = await getArtifactsOnPlanet(world, ARTIFACT_PLANET_1.id);
      let artifactsOnSpawn = await getArtifactsOnPlanet(world, SPAWN_PLANET_1.id);

      // ruins should have 1 artifact (gear is filtered), spawn planet should not.
      expect(artifactsOnRuins.length).to.eq(1);
      // Might fail w spaceships
      expect(artifactsOnSpawn.length).to.eq(0);

      // after finding artifact, planet's popCap might get buffed
      // so let it fill up again
      await increaseBlockchainTime();

      // move artifact; check that artifact is placed on voyage
      const moveTx = await world.user1Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, SPAWN_PLANET_1, 10, 50000, 0, newArtifactId)
      );
      const moveReceipt = await moveTx.wait();
      const voyageId = moveReceipt.events?.[0].args?.[1]; // emitted by ArrivalQueued
      await world.contract.refreshPlanet(ARTIFACT_PLANET_1.id);
      const oldLocArtifacts = await getArtifactsOnPlanet(world, ARTIFACT_PLANET_1.id);
      expect(oldLocArtifacts.length).to.equal(0);
      // confirming that artifact is on a voyage by checking that its no longer at the old
      // destination, and that its id is on the current voyage.
      const arrivalData = await world.contract.getPlanetArrival(voyageId);
      expect(arrivalData.carriedArtifactId).to.equal(newArtifactId);

      // when moving, both the ruins and the spawn planet should not have artifacts
      artifactsOnRuins = await getArtifactsOnPlanet(world, ARTIFACT_PLANET_1.id);
      artifactsOnSpawn = await getArtifactsOnPlanet(world, SPAWN_PLANET_1.id);
      expect(artifactsOnRuins.length).to.eq(0);
      expect(artifactsOnSpawn.length).to.eq(0);

      // fast forward to arrival
      await increaseBlockchainTime();
      await world.user1Core.refreshPlanet(SPAWN_PLANET_1.id);

      // check artifact is on the new planet. Hard to test artifact is NOT on a voyage. but if it
      // exists on a planet, it is not on a voyage.
      artifactsOnRuins = await getArtifactsOnPlanet(world, ARTIFACT_PLANET_1.id);
      artifactsOnSpawn = await getArtifactsOnPlanet(world, SPAWN_PLANET_1.id);
      expect(artifactsOnRuins.length).to.eq(0);
      expect(artifactsOnSpawn.length).to.eq(1);
    });

    it('should not be able to move more than some max amount of artifacts to a planet', async function () {
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL3_SPACETIME_1);

      const maxArtifactsOnPlanet = 4;
      for (let i = 0; i <= maxArtifactsOnPlanet; i++) {
        // place an artifact on the trading post
        const newTokenId = await createArtifact(
          world.contract,
          world.user1.address,
          ZERO_PLANET,
          ArtifactType.Monolith
        );
        await world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, newTokenId);

        // wait for the planet to fill up and download its stats
        await increaseBlockchainTime();
        await world.user1Core.refreshPlanet(LVL3_SPACETIME_1.id);
        const tradingPost2Planet = await world.user1Core.planets(LVL3_SPACETIME_1.id);

        if (i > maxArtifactsOnPlanet) {
          await expect(
            world.user1Core.move(
              ...makeMoveArgs(
                LVL3_SPACETIME_1,
                LVL0_PLANET_DEAD_SPACE,
                0,
                tradingPost2Planet.population.toNumber() - 1,
                0,
                newTokenId
              )
            )
          ).to.be.revertedWith(
            'the planet you are moving an artifact to can have at most 5 artifacts on it'
          );
        } else {
          // move the artifact from the trading post
          await world.user1Core.move(
            ...makeMoveArgs(
              LVL3_SPACETIME_1,
              LVL0_PLANET_DEAD_SPACE,
              0,
              tradingPost2Planet.population.toNumber() - 1,
              0,
              newTokenId
            )
          );
          await increaseBlockchainTime();
          await world.user1Core.refreshPlanet(LVL0_PLANET_DEAD_SPACE.id);
          const artifactsOnPlanet = await getArtifactsOnPlanet(world, LVL0_PLANET_DEAD_SPACE.id);
          expect(artifactsOnPlanet.length).to.eq(i + 1);
        }
      }
    });

    it("should be able to conquer another player's planet and move their artifact", async function () {
      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      // after finding artifact, planet's popCap might get buffed
      // so let it fill up again
      await increaseBlockchainTime();

      const artifactPlanetPopCap = (
        await world.contract.planets(ARTIFACT_PLANET_1.id)
      ).populationCap.toNumber();

      await world.user1Core.move(
        ...makeMoveArgs(
          ARTIFACT_PLANET_1,
          SPAWN_PLANET_1,
          10,
          Math.floor(artifactPlanetPopCap * 0.999), // if only 0.99 it's still untakeable, bc high def
          0
        )
      );

      // steal planet
      await world.user2Core.move(...makeMoveArgs(SPAWN_PLANET_2, ARTIFACT_PLANET_1, 0, 50000, 0));
      await increaseBlockchainTime();

      // move artifact
      await world.user2Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, LVL3_SPACETIME_2, 0, 50000, 0, newArtifactId)
      );
      await increaseBlockchainTime();

      // verify that artifact was moved
      await world.user2Core.withdrawArtifact(LVL3_SPACETIME_2.id, newArtifactId);
      const artifacts = await world.user2Core.balanceOf(world.user2.address, newArtifactId);

      expect(artifacts).to.be.equal(1);
    });

    it('not be able to prospect for an artifact on planets that are not ruins', async function () {
      await expect(world.user1Core.prospectPlanet(SPAWN_PLANET_1.id)).to.be.revertedWith(
        "you can't find an artifact on this planet"
      );
    });
    // TODO: Why do we need this test?
    it.skip('should mint randomly', async function () {
      // This can take upwards of 90000ms in CI
      this.timeout(0);

      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL3_SPACETIME_1);

      /* eslint-disable @typescript-eslint/no-explicit-any */
      let artifacts: any;
      let prevLocation = SPAWN_PLANET_1;

      for (let i = 0; i < 20; i++) {
        // byte #8 is 18_16 = 24_10 so it's a ruins planet
        const randomHex =
          `00007c2512896efb182d462faee0000fb33d58930eb9e6b4fbae6d048e9c44` +
          (i >= 10 ? i.toString()[0] : 0) +
          '' +
          (i % 10);

        const planetWithArtifactLoc = new TestLocation({
          hex: randomHex,
          perlin: SPACE_PERLIN,
          distFromOrigin: 1998,
        });

        await world.contract.adminInitializePlanet(
          planetWithArtifactLoc.id,
          planetWithArtifactLoc.perlin
        );

        await world.contract.adminGiveSpaceShip(
          planetWithArtifactLoc.id,
          world.user1.address,
          ArtifactType.ShipGear
        );

        await increaseBlockchainTime();

        await world.user1Core.move(
          ...makeMoveArgs(prevLocation, planetWithArtifactLoc, 0, 80000, 0)
        ); // move 80000 from asteroids but 160000 from ruins since ruins are higher level
        await increaseBlockchainTime();

        await world.user1Core.prospectPlanet(planetWithArtifactLoc.id);
        await increaseBlockchainTime();

        await world.user1Core.findArtifact(...makeFindArtifactArgs(planetWithArtifactLoc));
        await increaseBlockchainTime();

        const artifactsOnPlanet = await getArtifactsOnPlanet(world, planetWithArtifactLoc.id);
        const artifactId = artifactsOnPlanet[0].id;

        await world.user1Core.move(
          ...makeMoveArgs(planetWithArtifactLoc, LVL3_SPACETIME_1, 0, 40000, 0, artifactId)
        );
        await world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, artifactId);
        artifacts = await getArtifactsOwnedBy(world.contract, world.user1.address);

        expect(artifacts[artifacts.length - 1].planetBiome).to.eq(4); // tundra
        expect(artifacts[artifacts.length - 1].discoverer).to.eq(world.user1.address);
        expect(artifacts[artifacts.length - 1].rarity).to.be.at.least(1);

        prevLocation = planetWithArtifactLoc;
      }

      const artifactTypeSet = new Set();

      for (let i = 0; i < artifacts.length; i++) {
        artifactTypeSet.add(artifacts[i].artifactType);
      }

      expect(artifactTypeSet.size).to.be.greaterThan(1);
    });

    it('should not mint an artifact on the same planet twice', async function () {
      await world.user1Core.prospectPlanet(ARTIFACT_PLANET_1.id);
      await increaseBlockchainTime();
      await world.user1Core.findArtifact(...makeFindArtifactArgs(ARTIFACT_PLANET_1));
      await increaseBlockchainTime();
      await expect(
        world.user1Core.findArtifact(...makeFindArtifactArgs(ARTIFACT_PLANET_1))
      ).to.be.revertedWith('artifact already minted from this planet');
    });

    it('should not be able to move an activated artifact', async function () {
      const artifactId = await createArtifact(
        world.contract,
        world.user1.address,
        ARTIFACT_PLANET_1,
        ArtifactType.Monolith
      );
      await world.user1Core.activateArtifact(ARTIFACT_PLANET_1.id, artifactId, 0);

      await expect(
        world.user1Core.move(
          ...makeMoveArgs(ARTIFACT_PLANET_1, SPAWN_PLANET_1, 10, 50000, 0, artifactId)
        )
      ).to.be.revertedWith('you cannot take an activated artifact off a planet');
    });

    it("should not be able to move an artifact from a planet it's not on", async function () {
      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);
      // after finding artifact, planet's popCap might get buffed
      // so let it fill up again
      await increaseBlockchainTime();

      // move artifact
      world.user1Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, SPAWN_PLANET_1, 10, 50000, 0, newArtifactId)
      );

      // try moving artifact again; should fail
      await expect(
        world.user1Core.move(
          ...makeMoveArgs(ARTIFACT_PLANET_1, SPAWN_PLANET_1, 10, 50000, 0, newArtifactId)
        )
      ).to.be.revertedWith('this artifact was not present on this planet');

      // try moving nonexistent artifact
      await expect(
        world.user1Core.move(
          ...makeMoveArgs(ARTIFACT_PLANET_1, SPAWN_PLANET_1, 10, 50000, 0, 12345)
        )
      ).to.be.revertedWith('this artifact was not present on this planet');
    });
  });

  describe('trading post', function () {
    it('should be able to withdraw from / deposit onto trading posts you own', async function () {
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL3_SPACETIME_3);
      await increaseBlockchainTime();

      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      // move artifact to LVL3_SPACETIME_1
      await world.user1Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, LVL3_SPACETIME_1, 0, 50000, 0, newArtifactId)
      );
      await world.user1Core.refreshPlanet(LVL3_SPACETIME_1.id);

      // artifact should be on LVL3_SPACETIME_1
      let artifactsOnTP1 = await world.contract.getArtifactsOnPlanet(LVL3_SPACETIME_1.id);
      let artifactsOnTP2 = await world.contract.getArtifactsOnPlanet(LVL3_SPACETIME_3.id);
      await expect(artifactsOnTP1.find((a) => a.id === newArtifactId));
      await expect(artifactsOnTP1.length).to.eq(1);
      await expect(artifactsOnTP2.length).to.eq(0);

      // withdraw from LVL3_SPACETIME_1
      await world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, newArtifactId);

      // artifact should not be on any planet.
      artifactsOnTP1 = await world.contract.getArtifactsOnPlanet(LVL3_SPACETIME_1.id);
      artifactsOnTP2 = await world.contract.getArtifactsOnPlanet(LVL3_SPACETIME_3.id);
      await expect(artifactsOnTP1.length).to.eq(0);
      await expect(artifactsOnTP2.length).to.eq(0);

      // deposit onto LVL3_SPACETIME_3
      await world.user1Core.depositArtifact(LVL3_SPACETIME_3.id, newArtifactId);

      // artifact should be on LVL3_SPACETIME_3
      artifactsOnTP1 = await world.contract.getArtifactsOnPlanet(LVL3_SPACETIME_1.id);
      artifactsOnTP2 = await world.contract.getArtifactsOnPlanet(LVL3_SPACETIME_3.id);
      await expect(artifactsOnTP1.find((a) => a.id === newArtifactId));
      await expect(artifactsOnTP1.length).to.eq(0);
      await expect(artifactsOnTP2.length).to.eq(1);
    });

    it("should not be able to withdraw from / deposit onto trading post you don't own", async function () {
      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      // move artifact
      await world.user1Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, LVL3_SPACETIME_1, 0, 50000, 0, newArtifactId)
      );

      // user2 should not be able to withdraw from LVL3_SPACETIME_1
      await expect(
        world.user2Core.withdrawArtifact(LVL3_SPACETIME_1.id, newArtifactId)
      ).to.be.revertedWith('you can only withdraw from a planet you own');

      // user1 should not be able to deposit onto LVL3_SPACETIME_2
      world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, newArtifactId);
      await expect(
        world.user1Core.depositArtifact(LVL3_SPACETIME_2.id, newArtifactId)
      ).to.be.revertedWith('you can only deposit on a planet you own');
    });

    it('should not be able to withdraw an artifact from a trading post that is not on the trading post', async function () {
      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      // should not be able to withdraw newArtifactId from LVL3_SPACETIME_1
      await expect(
        world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, newArtifactId)
      ).to.be.revertedWith('artifact not found');
    });

    it('should not be able to withdraw/deposit onto a planet that is not a trading post', async function () {
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL0_PLANET);
      await increaseBlockchainTime();

      const newArtifactId = await user1MintArtifactPlanet(world.user1Core);

      // should not be able to withdraw from ruins (which are not trading posts)
      await expect(
        world.user2Core.withdrawArtifact(ARTIFACT_PLANET_1.id, newArtifactId)
      ).to.be.revertedWith('can only withdraw from trading posts');

      // move artifact and withdraw
      await world.user1Core.move(
        ...makeMoveArgs(ARTIFACT_PLANET_1, LVL3_SPACETIME_1, 0, 50000, 0, newArtifactId)
      );
      world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, newArtifactId);

      // should not be able to deposit onto LVL0_PLANET (which is regular planet and not trading post)
      await expect(
        world.user1Core.depositArtifact(LVL0_PLANET.id, newArtifactId)
      ).to.be.revertedWith('can only deposit on trading posts');
    });

    it('should not be able to withdraw/deposit a high level artifact onto low level trading post', async function () {
      await conquerUnownedPlanet(world, world.user1Core, LVL3_SPACETIME_1, LVL6_SPACETIME);
      await increaseBlockchainTime(); // allow planets to fill up energy again

      const newTokenId = await createArtifact(
        world.contract,
        world.user1.address,
        ZERO_PLANET,
        ArtifactType.Monolith,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Legendary, biome: Biome.OCEAN }
      );

      // deposit fails on low level trading post, succeeds on high level trading post
      await expect(
        world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, newTokenId)
      ).to.be.revertedWith('spacetime rip not high enough level to deposit this artifact');
      world.user1Core.depositArtifact(LVL6_SPACETIME.id, newTokenId);

      // withdraw fails on low level trading post
      await world.user1Core.move(
        ...makeMoveArgs(LVL6_SPACETIME, LVL3_SPACETIME_1, 0, 250000000, 0, newTokenId)
      );
      await expect(
        world.user1Core.withdrawArtifact(LVL3_SPACETIME_1.id, newTokenId)
      ).to.be.revertedWith('spacetime rip not high enough level to withdraw this artifact');

      // withdraw succeeds on high level post
      await world.user1Core.move(
        ...makeMoveArgs(LVL3_SPACETIME_1, LVL6_SPACETIME, 0, 500000, 0, newTokenId)
      );
      await world.user1Core.withdrawArtifact(LVL6_SPACETIME.id, newTokenId);
    });
  });

  describe('wormhole', function () {
    it('should increase movement speed, in both directions, and decrease after deactivation', async function () {
      // This can take an upwards of 32000ms
      this.timeout(0);

      const from = SPAWN_PLANET_1;
      const to = LVL0_PLANET;
      await conquerUnownedPlanet(world, world.user1Core, from, LVL3_UNOWNED_NEBULA);
      await conquerUnownedPlanet(world, world.user1Core, LVL3_UNOWNED_NEBULA, LVL6_SPACETIME);
      await conquerUnownedPlanet(world, world.user1Core, from, LVL0_PLANET);

      const dist = 50;
      const shipsSent = 10000;
      const silverSent = 0;

      const artifactRarities = [1, 2, 3, 4, 5]; // 0 is unknown, so we start at 1
      const wormholeSpeedups = [2, 4, 8, 16, 32];

      for (let i = 0; i < artifactRarities.length; i++) {
        const artifactId = await createArtifact(
          world.contract,
          world.user1.address,
          from,
          ArtifactType.Wormhole,
          TokenType.Artifact,
          { rarity: artifactRarities[i] as ArtifactRarity, biome: Biome.OCEAN }
        );
        prettyPrintToken(await world.contract.getArtifact(artifactId));

        activateAndConfirm(world.user1Core, from.id, artifactId, to.id);

        // move from planet with artifact to its wormhole destination
        await increaseBlockchainTime();
        await world.user1Core.move(...makeMoveArgs(from, to, dist, shipsSent, silverSent));
        const fromPlanet = await world.contract.planets(from.id);
        const planetArrivals = await world.contract.getPlanetArrivals(to.id);
        const arrival = planetArrivals[0];
        const expectedTime = Math.floor(
          Math.floor((dist * 100) / wormholeSpeedups[i]) / fromPlanet.speed.toNumber()
        );

        expect(arrival.arrivalTime.sub(arrival.departureTime).toNumber()).to.be.equal(expectedTime);

        // move from the wormhole destination planet back to the planet whose wormhole is pointing at
        // it
        await increaseBlockchainTime();
        await world.user1Core.move(...makeMoveArgs(to, from, dist, shipsSent, silverSent));
        const fromPlanetInverted = await world.contract.planets(to.id);
        const planetArrivalsInverted = await world.contract.getPlanetArrivals(from.id);
        const arrivalInverted = planetArrivalsInverted[0];
        const expectedTimeInverted = Math.floor(
          Math.floor((dist * 100) / wormholeSpeedups[i]) / fromPlanetInverted.speed.toNumber()
        );

        expect(arrivalInverted.arrivalTime.sub(arrivalInverted.departureTime)).to.be.equal(
          expectedTimeInverted
        );

        await world.user1Core.deactivateArtifact(from.id);

        // Move from planet with artifact to destination and expect speed is not boosted.
        await world.user1Core.move(...makeMoveArgs(from, to, dist, shipsSent, silverSent));
        const fromPlanetAfterDActivate = await world.contract.planets(from.id);
        const planetArrivalsAfterDActivate = await world.contract.getPlanetArrivals(to.id);
        const arrivalAfterDActivate = planetArrivalsAfterDActivate[0];
        const expectedTimeAfterDActivate = Math.floor(
          Math.floor(dist * 100) / fromPlanetAfterDActivate.speed.toNumber()
        );

        expect(
          arrivalAfterDActivate.arrivalTime.sub(arrivalAfterDActivate.departureTime).toNumber()
        ).to.be.equal(expectedTimeAfterDActivate);
      }
    });

    it("shouldn't transfer energy to planets that aren't owned by the sender", async function () {
      const from = SPAWN_PLANET_1;
      const to = LVL0_PLANET;

      // user 2 takes over a larger planet
      await conquerUnownedPlanet(world, world.user2Core, SPAWN_PLANET_2, LVL3_UNOWNED_NEBULA);

      // user 1 takes over the 2nd planet
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, to);
      await world.user1Core.refreshPlanet(to.id);
      const toPlanet = await world.contract.planets(to.id);
      expect(toPlanet.owner).to.eq(world.user1.address);

      // create a wormhole
      const artifactId = await createArtifact(
        world.contract,
        world.user1.address,
        from,
        ArtifactType.Wormhole,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Common, biome: Biome.OCEAN }
      );

      // Move gear bc too many artifacts on SPAWN_PLANET_1, so can't receive wormhole.
      const crescentShip = (await world.user1Core.getSpaceshipsOnPlanet(SPAWN_PLANET_1.id)).find(
        (ship) => ship.spaceshipType === SpaceshipType.ShipCrescent
      );

      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, LVL0_PLANET, 0, 0, 0, crescentShip?.id)
      );

      const userWormholeBalance = await world.contract.balanceOf(world.user1.address, artifactId);
      expect(userWormholeBalance).to.eq(1);

      // activate the wormhole to the 2nd planet
      await world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, artifactId);

      await world.user1Core.move(
        ...makeMoveArgs(LVL3_SPACETIME_1, SPAWN_PLANET_1, 0, 500000, 0, artifactId)
      );

      await world.user1Core.activateArtifact(from.id, artifactId, to.id);

      const dist = 50;
      const shipsSent = 10000;
      const silverSent = 0;

      await increaseBlockchainTime();

      // user 2 takes over the wormhole's destination
      const largePlanet = await world.contract.planets(LVL3_UNOWNED_NEBULA.id);
      await world.user2Core.move(
        ...makeMoveArgs(LVL3_UNOWNED_NEBULA, to, 10, largePlanet.populationCap.div(2), 0)
      );
      await increaseBlockchainTime();
      await world.user1Core.refreshPlanet(to.id);
      const toPlanetOwnedBySecond = await world.contract.planets(to.id);
      expect(toPlanetOwnedBySecond.owner).to.eq(world.user2.address);

      // ok, now for the test: move from the planet with the wormhole to its wormhole target
      await increaseBlockchainTime();
      await world.user1Core.move(...makeMoveArgs(from, to, dist, shipsSent, silverSent));

      // check that the move is sped up
      const fromPlanet = await world.contract.planets(from.id);
      const planetArrivals = await world.contract.getPlanetArrivals(to.id);
      const arrival = planetArrivals[0];
      const expectedTime = Math.floor((Math.floor(dist / 2) * 100) / fromPlanet.speed.toNumber());
      expect(arrival.arrivalTime.sub(arrival.departureTime)).to.be.equal(expectedTime);

      // fast forward to the time that the arrival is scheduled to arrive
      const currentTime = await getCurrentTime();
      await increaseBlockchainTime(arrival.arrivalTime.toNumber() - currentTime - 5);
      await world.user1Core.refreshPlanet(to.id);
      const planetPreArrival = await world.contract.planets(to.id);
      const arrivalsPreArrival = await world.contract.getPlanetArrivals(to.id);

      await increaseBlockchainTime(6);
      await world.user1Core.refreshPlanet(to.id);
      const planetPostArrival = await world.contract.planets(to.id);
      const arrivalsPostArrival = await world.contract.getPlanetArrivals(to.id);

      // expect that the arrival transfered precisely zero energy.
      expect(planetPreArrival.population).to.eq(planetPostArrival.population);
      expect(arrivalsPreArrival.length).to.eq(1);
      expect(arrivalsPostArrival.length).to.eq(0);
    });
  });

  describe('bloom filter', function () {
    it('is burnt after usage, and should fill energy and silver', async function () {
      const from = SPAWN_PLANET_1;
      const dist = 50;
      const shipsSent = 10000;
      const silverSent = 0;

      await world.user1Core.move(...makeMoveArgs(from, LVL0_PLANET, dist, shipsSent, silverSent));

      const planetBeforeBloomFilter = await world.user1Core.planets(from.id);
      expect(planetBeforeBloomFilter.population.toNumber()).to.be.lessThan(
        planetBeforeBloomFilter.populationCap.toNumber()
      );
      expect(planetBeforeBloomFilter.silver).to.eq(0);

      const newTokenId = await createArtifact(
        world.contract,
        world.user1.address,
        ZERO_PLANET,
        ArtifactType.BloomFilter,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Common, biome: Biome.OCEAN }
      );
      prettyPrintToken(await world.contract.getArtifact(newTokenId));

      await increaseBlockchainTime(); // so that trading post can fill up to max energy
      await world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, newTokenId);
      await world.user1Core.move(
        ...makeMoveArgs(LVL3_SPACETIME_1, SPAWN_PLANET_1, 0, 500000, 0, newTokenId)
      );
      await world.user1Core.activateArtifact(from.id, newTokenId, 0);

      const planetAfterBloomFilter = await world.user1Core.planets(from.id);
      expect(planetAfterBloomFilter.population).to.eq(planetAfterBloomFilter.populationCap);
      expect(planetAfterBloomFilter.silver).to.eq(planetAfterBloomFilter.silverCap);

      const artifactsOnRipAfterBurn = await getArtifactsOnPlanet(world, SPAWN_PLANET_1.id);

      // bloom filter is immediately deactivated after activation
      expect(artifactsOnRipAfterBurn.length).to.equal(0);

      // bloom filter is no longer on a planet (is instead owned by contract), and so is effectively burned
      // expect(bloomFilterPostActivation.locationId.toString()).to.eq('0');
    });

    it("can't be used on a planet of too high level", async function () {
      this.timeout(1000 * 60);
      await conquerUnownedPlanet(world, world.user1Core, LVL3_SPACETIME_1, LVL4_UNOWNED_DEEP_SPACE);
      const from = SPAWN_PLANET_1;

      const dist = 50;
      const shipsSent = 10000;
      const silverSent = 0;

      await world.user1Core.move(...makeMoveArgs(from, LVL0_PLANET, dist, shipsSent, silverSent));

      const planetBeforeBloomFilter = await world.user1Core.planets(from.id);
      expect(planetBeforeBloomFilter.population.toNumber()).to.be.lessThan(
        planetBeforeBloomFilter.populationCap.toNumber()
      );
      expect(planetBeforeBloomFilter.silver).to.eq(0);

      const newTokenId = await createArtifact(
        world.contract,
        world.user1.address,
        ZERO_PLANET,
        ArtifactType.BloomFilter,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Common, biome: Biome.OCEAN }
      );

      prettyPrintToken(await world.contract.getArtifact(newTokenId));
      await increaseBlockchainTime(); // so that trading post can fill up to max energy
      await world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, newTokenId);
      await world.user1Core.move(
        ...makeMoveArgs(LVL3_SPACETIME_1, LVL4_UNOWNED_DEEP_SPACE, 0, 500000, 0, newTokenId)
      );
      await expect(
        world.user1Core.activateArtifact(LVL4_UNOWNED_DEEP_SPACE.id, newTokenId, 0)
      ).to.be.revertedWith('artifact is not powerful enough to apply effect to this planet level');
    });
  });

  describe('black domain', function () {
    it('is burnt after usage, and prevents moves from being made to it and from it', async function () {
      const to = LVL0_PLANET;
      const dist = 50;
      const shipsSent = 10000;
      const silverSent = 0;

      await world.user1Core.move(...makeMoveArgs(SPAWN_PLANET_1, to, dist, shipsSent, silverSent));
      await increaseBlockchainTime();

      await world.user1Core.refreshPlanet(to.id);
      const conqueredSecondPlanet = await world.user1Core.planets(to.id);
      expect(conqueredSecondPlanet.owner).to.eq(world.user1.address);

      const newTokenId = await createArtifact(
        world.contract,
        world.user1.address,
        ZERO_PLANET,
        ArtifactType.BlackDomain,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Common, biome: Biome.OCEAN }
      );

      await world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, newTokenId);
      await world.user1Core.move(...makeMoveArgs(LVL3_SPACETIME_1, to, 0, 500000, 0, newTokenId));
      await world.user1Core.activateArtifact(to.id, newTokenId, 0);

      // black domain is no longer on a planet (is instead owned by contract), and so is effectively
      // burned
      testDeactivate(world, to.id);

      // check the planet is destroyed
      const newPlanet = await world.user1Core.planets(to.id);
      expect(newPlanet.destroyed).to.eq(true);

      await increaseBlockchainTime();

      // moves to destroyed planets don't work
      await expect(
        world.user1Core.move(...makeMoveArgs(SPAWN_PLANET_1, to, dist, shipsSent, silverSent))
      ).to.be.revertedWith('planet is destroyed');

      // moves from destroyed planets also don't work
      await expect(
        world.user1Core.move(...makeMoveArgs(SPAWN_PLANET_1, to, dist, shipsSent, silverSent))
      ).to.be.revertedWith('planet is destroyed');
    });

    it("can't be used on a planet of too high level", async function () {
      this.timeout(1000 * 60);
      await conquerUnownedPlanet(world, world.user1Core, LVL3_SPACETIME_1, LVL4_UNOWNED_DEEP_SPACE);
      const from = SPAWN_PLANET_1;
      const dist = 50;
      const shipsSent = 10000;
      const silverSent = 0;

      await world.user1Core.move(...makeMoveArgs(from, LVL0_PLANET, dist, shipsSent, silverSent));

      const planetBeforeBlackDomain = await world.user1Core.planets(from.id);
      expect(planetBeforeBlackDomain.population.toNumber()).to.be.lessThan(
        planetBeforeBlackDomain.populationCap.toNumber()
      );
      expect(planetBeforeBlackDomain.silver).to.eq(0);

      const newTokenId = await createArtifact(
        world.contract,
        world.user1.address,
        ZERO_PLANET,
        ArtifactType.BlackDomain,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Common, biome: Biome.OCEAN }
      );

      await increaseBlockchainTime(); // so that trading post can fill up to max energy
      await world.user1Core.depositArtifact(LVL3_SPACETIME_1.id, newTokenId);
      await world.user1Core.move(
        ...makeMoveArgs(LVL3_SPACETIME_1, LVL4_UNOWNED_DEEP_SPACE, 0, 500000, 0, newTokenId)
      );
      await expect(
        world.user1Core.activateArtifact(LVL4_UNOWNED_DEEP_SPACE.id, newTokenId, 0)
      ).to.be.revertedWith('artifact is not powerful enough to apply effect to this planet level');
    });
  });

  describe('planetary shield', function () {
    it('activates planetary shield, + defense, - range, then burns shield', async function () {
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL3_SPACETIME_1);

      const newTokenId = await createArtifact(
        world.contract,
        world.user1.address,
        LVL3_SPACETIME_1,
        ArtifactType.PlanetaryShield,
        TokenType.Artifact,
        { rarity: ArtifactRarity.Rare as ArtifactRarity, biome: Biome.OCEAN }
      );
      prettyPrintToken(await world.contract.getArtifact(newTokenId));

      const planetBeforeActivation = await world.user1Core.planets(LVL3_SPACETIME_1.id);
      await activateAndConfirm(world.user1Core, LVL3_SPACETIME_1.id, newTokenId);
      const planetAfterActivation = await world.user1Core.planets(LVL3_SPACETIME_1.id);

      // Boosts are applied
      expect(planetBeforeActivation.defense).to.be.lessThan(planetAfterActivation.defense);
      expect(planetBeforeActivation.range).to.be.greaterThan(planetAfterActivation.range);
      expect(planetBeforeActivation.speed).to.be.greaterThan(planetAfterActivation.speed);

      // Burned on deactivate
      await world.user1Core.deactivateArtifact(LVL3_SPACETIME_1.id);

      expect((await getArtifactsOnPlanet(world, LVL3_SPACETIME_1.id)).length).to.equal(0);
      expect((await world.user1Core.getActiveArtifactOnPlanet(LVL3_SPACETIME_1.id)).id).to.equal(0);
      expect(await world.user1Core.getArtifactActivationTimeOnPlanet(LVL3_SPACETIME_1.id)).to.equal(
        0
      );
    });
  });

  describe('photoid cannon', function () {
    it('activates photoid cannon, increases move speed and range, then burns photoid', async function () {
      await conquerUnownedPlanet(world, world.user1Core, LVL3_SPACETIME_1, LVL6_SPACETIME);
      await increaseBlockchainTime();

      const to = LVL0_PLANET;
      const dist = 50;
      const forces = 40000000; // Has to be big to account for

      const rangeBoosts = [100, 200, 200, 200, 200, 200];
      // Divided by 100 to reflect effect on travel time.
      const speedBoosts = [1, 5, 10, 15, 20, 25];
      const artifactRarities = [1, 2, 3, 4, 5];

      for (let i = 0; i < artifactRarities.length; i++) {
        const newTokenId = await createArtifact(
          world.contract,
          world.user1.address,
          ZERO_PLANET,
          ArtifactType.PhotoidCannon,
          TokenType.Artifact,
          { rarity: artifactRarities[i] as ArtifactRarity, biome: Biome.OCEAN }
        );
        prettyPrintToken(await world.contract.getArtifact(newTokenId));

        await world.user1Core.depositArtifact(LVL6_SPACETIME.id, newTokenId);

        // Confirm photoid cannon is activated.
        await activateAndConfirm(world.user1Core, LVL6_SPACETIME.id, newTokenId);

        await increaseBlockchainTime();

        // Make a move that uses photoid cannon
        await world.user1Core.move(
          ...makeMoveArgs(LVL6_SPACETIME, to, dist, forces, 0, newTokenId)
        );
        const fromPlanet = await world.contract.planets(LVL6_SPACETIME.id);
        const planetArrivals = await world.contract.getPlanetArrivals(to.id);
        const arrival = planetArrivals[0];

        const expectedTime = Math.floor(
          Math.floor((dist * 100) / speedBoosts[i + 1]) / fromPlanet.speed.toNumber()
        );

        expect(arrival.arrivalTime.sub(arrival.departureTime).toNumber()).to.be.equal(expectedTime);

        const range = (fromPlanet.range.toNumber() * rangeBoosts[i + 1]) / 100;
        const popCap = fromPlanet.populationCap.toNumber();
        const decayFactor = Math.pow(2, dist / range);
        const approxArriving = forces / decayFactor - 0.05 * popCap;

        expect(planetArrivals[0].popArriving.toNumber()).to.be.above(approxArriving - 1000);
        expect(planetArrivals[0].popArriving.toNumber()).to.be.below(approxArriving + 1000);

        // Confirm photoid is burned
        await testDeactivate(world, LVL6_SPACETIME.id);
      }
    });
  });
});
