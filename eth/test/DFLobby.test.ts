import { DarkForest } from '@dfdao/contracts/typechain';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { createArena, defaultWorldFixture, World } from './utils/TestWorld';

const _INTERFACE_ID_IERC165 = '0x01ffc9a7';
const _INTERFACE_ID_IERC1155 = '0xd9b67a26';
const _INTERFACE_ID_IERC1155METADATA = '0x0e89341c';
const _INTERFACE_ID_IERC1155ENUMERABLE = '0x464FCF40';
const _INTERFACE_ID_IDIAMOND_READABLE = '0x48e2b093';
const _INTERFACE_ID_IDIAMOND_WRITABLE = '0x1f931c1c';
const _INTERFACE_ID_IERC173 = '0x7f5828d0';

describe('DarkForestLobby', function () {
  let world: World;
  let lobby: DarkForest;
  const initAddress = ethers.constants.AddressZero;
  const initFunctionCall = '0x';

  async function worldFixture() {
    const _world = await loadFixture(defaultWorldFixture);
    const _lobby = await createArena(_world.user1Core, hre.settings.darkforest.initializers);
    return { _world, _lobby };
  }

  beforeEach('load fixture', async function () {
    const { _world, _lobby } = await loadFixture(worldFixture);
    world = _world;
    lobby = _lobby;
  });

  it('Makes a new lobby', async function () {
    await expect(world.user1Core.createLobby(initAddress, initFunctionCall)).to.emit(
      world.contract,
      'LobbyCreated'
    );
  });
  it('Transfers Ownership', async function () {
    await expect(world.contract.transferOwnership(world.user1.address)).to.emit(
      world.contract,
      'OwnershipTransferred'
    );
  });
  it('msg.sender is owner of new Lobby', async function () {
    expect(await lobby.owner()).to.equal(world.user1.address);
  });
  it('new Lobby has correct Diamond interfaces', async function () {
    // IDiamondWritable, IDiamondReadable, IERC173, IERC165
    expect(await lobby.supportsInterface(_INTERFACE_ID_IERC165)).to.equal(true);
    expect(await lobby.supportsInterface(_INTERFACE_ID_IDIAMOND_READABLE)).to.equal(true);
    expect(await lobby.supportsInterface(_INTERFACE_ID_IDIAMOND_WRITABLE)).to.equal(true);
    expect(await lobby.supportsInterface(_INTERFACE_ID_IERC173)).to.equal(true);
  });
  it('new Lobby has correct ERC1155 interfaces', async function () {
    expect(await lobby.supportsInterface(_INTERFACE_ID_IERC1155)).to.equal(true);
    expect(await lobby.supportsInterface(_INTERFACE_ID_IERC1155METADATA)).to.equal(true);
    expect(await lobby.supportsInterface(_INTERFACE_ID_IERC1155ENUMERABLE)).to.equal(true);
  });

  it('test fallback', async function () {
    expect(await lobby.getFallbackAddress()).to.equal(ethers.constants.AddressZero);
  });
});
