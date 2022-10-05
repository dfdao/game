import { ArtifactRarity, ArtifactType, Biome } from '@dfdao/types';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { makeInitArgs } from './utils/TestUtils';
import { defaultWorldFixture, World } from './utils/TestWorld';
import { SPAWN_PLANET_1, SPAWN_PLANET_2 } from './utils/WorldConstants';

describe('DarkForestShop', async function () {
  let world: World;
  const playerInitialSilver = 10000;

  async function worldFixture() {
    const world = await loadFixture(defaultWorldFixture);

    await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    await world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2));

    const silverToken = await world.contract.getSilverTokenId();

    await world.contract.mint(world.user1.address, silverToken, playerInitialSilver);
    return world;
  }

  this.beforeEach('load fixture', async function () {
    world = await loadFixture(worldFixture);
  });

  describe('Purchasing artifacts', async function () {
    it('mints the proper number of tokens for player1', async function () {
      const user1SilverBalance = await world.contract.getSilverBalance(world.user1.address);
      expect(user1SilverBalance).to.equal(playerInitialSilver);
    });

    it('calculates the correct price for an artifact', async function () {
      const commonMonolithPrice = await world.contract.getArtifactPrice(
        ArtifactType.Monolith,
        ArtifactRarity.Common
      );

      expect(commonMonolithPrice).to.equal(100);
    });

    it('allows a rich player to buy a common monolith', async function () {
      const commonMonolithPrice = await world.contract.getArtifactPrice(
        ArtifactType.Monolith,
        ArtifactRarity.Common
      );

      const commonMonolithId = await world.contract.getArtifactTokenId(
        ArtifactType.Monolith,
        ArtifactRarity.Common,
        Biome.OCEAN
      );

      await expect(world.user1Core.purchaseArtifact(ArtifactType.Monolith, ArtifactRarity.Common))
        .to.emit(world.contract, 'ArtifactPurchased')
        .withArgs(world.user1.address, commonMonolithId);

      expect((await world.user1Core.getSilverBalance(world.user1.address)).toNumber()).to.equal(
        playerInitialSilver - commonMonolithPrice.toNumber()
      );

      expect(await world.user1Core.tokenIsOwnedBy(world.user1.address, commonMonolithId)).to.be
        .true;

      expect(
        (await world.user1Core.getTokenBalance(world.user1.address, commonMonolithId)).toNumber()
      ).to.equal(1);
    });

    it("doesn't allow a broke player to buy a common monolith", async function () {
      await expect(
        world.user2Core.purchaseArtifact(ArtifactType.Monolith, ArtifactRarity.Common)
      ).to.be.revertedWith('not enough silver to purchase this artifact');
    });

    it("doesn't allow a player to buy an invalid artifact", async function () {
      await expect(
        world.user1Core.purchaseArtifact(ArtifactType.Unknown, ArtifactRarity.Common)
      ).to.be.revertedWith('artifact type is not valid');
      await expect(
        world.user1Core.purchaseArtifact(ArtifactType.Monolith, ArtifactRarity.Unknown)
      ).to.be.revertedWith('artifact rarity is not valid');
    });
  });
});
