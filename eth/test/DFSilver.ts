import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import {
  conquerUnownedPlanet,
  feedSilverToCap,
  increaseBlockchainTime,
  makeInitArgs,
} from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import {
  LVL1_ASTEROID_1,
  LVL1_ASTEROID_2,
  LVL1_ASTEROID_DEEP_SPACE,
  LVL1_ASTEROID_NEBULA,
  LVL3_SPACETIME_1,
  SPAWN_PLANET_1,
} from './utils/WorldConstants';

const CONTRACT_PRECISION = 1_000;
const SILVER_TOKEN_ID = '0x0300000000000000000000000000000000000000000000000000000000000000';

describe.only('DFSilver', async function () {
  // Bump the time out so that the test doesn't timeout during
  // initial fixture creation
  this.timeout(1000 * 60);
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);
    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));

    // Conquer MINE_REGULAR and LVL3_SPACETIME_1 to accumulate silver
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_1);
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL3_SPACETIME_1);

    // Fill up LVL3_SPACETIME_1 with silvers
    await feedSilverToCap(world, world.user1Core, LVL1_ASTEROID_1, LVL3_SPACETIME_1);

    return world;
  }

  beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });

  it('allows player to withdraw silver from trading posts', async function () {
    const withdrawnAmount = (await world.contract.planets(LVL3_SPACETIME_1.id)).silverCap;

    await expect(world.user1Core.withdrawSilver(LVL3_SPACETIME_1.id, withdrawnAmount))
      .to.emit(world.contract, 'PlanetSilverWithdrawn')
      .withArgs(world.user1.address, LVL3_SPACETIME_1.id, withdrawnAmount);

    // According to DarkForestPlanet.sol:
    // Energy and Silver are not stored as floats in the smart contracts,
    // so any of those values coming from the contracts need to be divided by
    // `CONTRACT_PRECISION` to get their true integer value.
    // FIXME(blaine): This should have been done client-side because this type of
    // division isn't supposed to be done in the contract. That's the whole point of
    // `CONTRACT_PRECISION`
    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(
      withdrawnAmount.div(1000)
    );
  });

  it('allows player to bulk withdraw silver from asteroids', async function () {
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_2);
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_NEBULA);
    await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_ASTEROID_DEEP_SPACE);

    // await feedSilverToCap(world, world.user1Core, LVL1_ASTEROID_1, LVL3_SPACETIME_2);
    const ast1 = await world.contract.planets(LVL1_ASTEROID_1.id);
    const ast2 = await world.contract.planets(LVL1_ASTEROID_2.id);
    const ast3 = await world.contract.planets(LVL1_ASTEROID_NEBULA.id);
    const ast4 = await world.contract.planets(LVL1_ASTEROID_DEEP_SPACE.id);

    // Let Asteroids fill up
    await increaseBlockchainTime();

    const tx = await world.user1Core.bulkWithdrawSilverAsteroid([
      LVL1_ASTEROID_1.id,
      LVL1_ASTEROID_2.id,
      LVL1_ASTEROID_NEBULA.id,
      LVL1_ASTEROID_DEEP_SPACE.id,
    ]);
    const rct = await tx.wait();
    console.log(`bulk withdraw used ${rct.gasUsed.toNumber() / 4} gas per asteroid`);

    expect(
      await (await world.contract.balanceOf(world.user1.address, SILVER_TOKEN_ID)).toNumber()
    ).to.equal(
      ast1.silverCap.add(ast2.silverCap).add(ast3.silverCap).add(ast4.silverCap).toNumber() /
        CONTRACT_PRECISION
    );
  });

  it("doesn't allow player to withdraw more silver than planet has", async function () {
    const withdrawnAmount = (await world.contract.planets(LVL3_SPACETIME_1.id)).silverCap.add(1000);

    await expect(
      world.user1Core.withdrawSilver(LVL3_SPACETIME_1.id, withdrawnAmount)
    ).to.be.revertedWith('tried to withdraw more silver than exists on planet');

    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(0);
  });

  it("doesn't allow player to withdraw silver from non-trading post", async function () {
    const withdrawnAmount = (await world.contract.planets(LVL1_ASTEROID_1.id)).silverCap;

    await expect(
      world.user1Core.withdrawSilver(LVL1_ASTEROID_1.id, withdrawnAmount)
    ).to.be.revertedWith('can only withdraw silver from trading posts');

    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(0);
  });

  it("doesn't allow player to withdraw silver from planet that is not theirs", async function () {
    const withdrawnAmount = (await world.contract.planets(LVL3_SPACETIME_1.id)).silverCap;

    await expect(
      world.user2Core.withdrawSilver(LVL3_SPACETIME_1.id, withdrawnAmount)
    ).to.be.revertedWith('you must own this planet');

    expect(await world.contract.getSilverBalance(world.user1.address)).to.equal(0);
    expect(await world.contract.getSilverBalance(world.user2.address)).to.equal(0);
  });
});
