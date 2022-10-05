import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { conquerUnownedPlanet, increaseBlockchainTime, makeInitArgs } from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import {
  LVL1_ASTEROID_1,
  LVL1_ASTEROID_2,
  LVL1_ASTEROID_DEEP_SPACE,
  LVL1_ASTEROID_NEBULA,
  SPAWN_PLANET_1,
} from './utils/WorldConstants';

const CONTRACT_PRECISION = 1_000;

describe('DFSilver', async function () {
  // Bump the time out so that the test doesn't timeout during
  // initial fixture creation
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);
    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));

    // Conquer MINE_REGULAR and LVL3_SPACETIME_1 to accumulate silver
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_1);

    await increaseBlockchainTime();

    // Wait for Asteroid to fill up
    await world.contract.refreshPlanet(LVL1_ASTEROID_1.id);
    return world;
  }

  beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });

  it('allows player to withdraw silver from asteroid', async function () {
    const withdrawnAmount = (await world.contract.planets(LVL1_ASTEROID_1.id)).silverCap.div(1000);

    await expect(world.user1Core.withdrawSilver(LVL1_ASTEROID_1.id))
      .to.emit(world.contract, 'PlanetSilverWithdrawn')
      .withArgs(world.user1.address, LVL1_ASTEROID_1.id, withdrawnAmount);

    // According to DarkForestPlanet.sol:
    // Energy and Silver are not stored as floats in the smart contracts,
    // so any of those values coming from the contracts need to be divided by
    // `CONTRACT_PRECISION` to get their true integer value.
    // FIXME(blaine): This should have been done client-side because this type of
    // division isn't supposed to be done in the contract. That's the whole point of
    // `CONTRACT_PRECISION`
    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(withdrawnAmount);
  });

  it('allows player to bulk withdraw silver from asteroids', async function () {
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_2);
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_NEBULA);
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_DEEP_SPACE);

    // await feedSilverToCap(world, world.user1Core, LVL1_ASTEROID_1, LVL3_SPACETIME_2);

    // Let Asteroids fill up
    await increaseBlockchainTime();

    const tx = await world.user1Core.bulkWithdrawSilver([
      LVL1_ASTEROID_1.id,
      LVL1_ASTEROID_2.id,
      LVL1_ASTEROID_NEBULA.id,
      LVL1_ASTEROID_DEEP_SPACE.id,
    ]);

    const rct = await tx.wait();
    console.log(`bulk withdraw used ${rct.gasUsed.toNumber() / 4} gas per asteroid`);

    const ast1 = await world.contract.planets(LVL1_ASTEROID_1.id);
    const ast2 = await world.contract.planets(LVL1_ASTEROID_2.id);
    const ast3 = await world.contract.planets(LVL1_ASTEROID_NEBULA.id);
    const ast4 = await world.contract.planets(LVL1_ASTEROID_DEEP_SPACE.id);

    // Confirm all silver has been withdrawn
    expect(ast1.silver).to.equal(0);
    expect(ast2.silver).to.equal(0);
    expect(ast3.silver).to.equal(0);
    expect(ast4.silver).to.equal(0);

    const expectedSilverMint =
      ast1.silverCap.add(ast2.silverCap).add(ast3.silverCap).add(ast4.silverCap).toNumber() /
      CONTRACT_PRECISION;
    expect((await world.contract.getSilverBalance(world.user1.address)).toNumber()).to.equal(
      expectedSilverMint
    );
  });

  it("doesn't allow player to withdraw silver from non asteroid", async function () {
    await expect(world.user1Core.withdrawSilver(SPAWN_PLANET_1.id)).to.be.revertedWith(
      'can only withdraw silver from asteroids'
    );

    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(0);
  });

  it("doesn't allow player to withdraw silver from planet that is not theirs", async function () {
    await expect(world.user2Core.withdrawSilver(LVL1_ASTEROID_1.id)).to.be.revertedWith(
      'you must own this planet'
    );

    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(0);
    expect(await world.contract.getSilverBalance(world.user2.address)).to.equal(0);
  });
});
