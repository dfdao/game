import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BN_ZERO, makeInitArgs } from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import { SPAWN_PLANET_1 } from './utils/WorldConstants';

describe('DarkForestHat', function () {
  let world: World;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);
    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    return world;
  }

  beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });

  it('should buy hats', async function () {
    let planet = await world.contract.planets(SPAWN_PLANET_1.id);
    expect(planet.hatLevel.toNumber()).to.be.equal(0);

    await world.user1Core.buyHat(SPAWN_PLANET_1.id, {
      value: '1000000000000000000',
    });
    await world.user1Core.buyHat(SPAWN_PLANET_1.id, {
      value: '2000000000000000000',
    });

    planet = await world.contract.planets(SPAWN_PLANET_1.id);
    expect(planet.hatLevel.toNumber()).to.be.equal(2);
  });

  it('should only allow owner to buy hat', async function () {
    const planet = await world.contract.planets(SPAWN_PLANET_1.id);
    expect(planet.hatLevel.toNumber()).to.be.equal(0);

    await expect(
      world.user2Core.buyHat(SPAWN_PLANET_1.id, {
        value: '1000000000000000000',
      })
    ).to.be.revertedWith('Only owner account can perform that operation on planet.');
  });

  it('should not buy hat with insufficient value', async function () {
    const planet = await world.contract.planets(SPAWN_PLANET_1.id);
    expect(planet.hatLevel.toNumber()).to.be.equal(0);

    await world.user1Core.buyHat(SPAWN_PLANET_1.id, {
      value: '1000000000000000000',
    });
    await expect(
      world.user1Core.buyHat(SPAWN_PLANET_1.id, {
        value: '1500000000000000000',
      })
    ).to.be.revertedWith('Wrong value sent');
  });

  it('should allow admin to withdraw all funds', async function () {
    await world.user1Core.buyHat(SPAWN_PLANET_1.id, {
      value: '1000000000000000000',
    });

    await world.contract.withdraw();

    expect(await ethers.provider.getBalance(world.contract.address)).to.equal(BN_ZERO);
  });

  it('should not allow non-admin to withdraw funds', async function () {
    await world.user1Core.buyHat(SPAWN_PLANET_1.id, {
      value: '1000000000000000000',
    });

    await expect(world.user1Core.withdraw()).to.be.revertedWith(
      'LibDiamond: Must be contract owner'
    );
  });
});
