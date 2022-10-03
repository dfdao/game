# Dark Forest Tokens (ERC1155):

Each token in Dark Forest is a collection under the ERC1155 Standard.

Each collection has a `tokenId` can be fungible (supply > 1) or non-fungible (supply = 1).

The fundamental data structure in ERC1155 is `mapping(uint256 => mapping(address => uint256)) balances;`.

`balances[tokenId][myAddress]` = number of tokens I have of a given collection.

The `uint256` `tokenId`, which identifies a _set_ of tokens, is represented in the following way:

Each `uint256` `tokenId` is broken down into 32 chunks of 8 bits each (32\*8 = 256).

> | chunk1 | chunk 2 | ... chunk32 |.

Chunks are used from left to right, so a token that has a value of `0xff` in chunk1 looks like`0xff00000000000000000000000000000000000000000000000000000000000000`

Another way to visualize the `tokenId` is by highlighting each chunk: `0x**ff**_00_**00**_00_**00**_00_...`

Each chunk allows for 2^8 (256) unique pieces of information. If you need more than 256 properties
of a token, you can use an additional chunk.

For example, if you wanted to add a new property to an Artifact called `Weather`, you use the next
chunk(s) to encode that value. You would have 256 options for what `Weather` an Artifact could have.

This architecture allows us to encode information about a Dark Forest token in the `tokenId` itself,
and, more importantly, it allows to create a copy of a token just by using the same `tokenId`.

This concept will become clearer as we examine how these rules are used for Artifacts and
Spaceships.

Each of these chunks has 256 options. So you can have 256 Artifact Rarities, Types, Biomes etc...
This should be plenty, but if you need more you just use another chunk.

## General Token Info

Each collection (called a Token) in Dark Forest must have a Library dedicated to it with the naming
convention `Lib<TokenName>.sol`.

The first byte (from left) of the tokenId **must** correspond to the appropriate value in the
`TokenType` struct in `DFTypes.sol`

```js
enum TokenType {
    Unknown,
    Artifact, // 0x01 = Artifact
    Spaceship // 0x02 = Spaceship
    // etc...
}
```

The `Lib<TokenName>.sol`. file **must** have the following methods:

1.  `encode(<TokenName>) returns (uint256 tokenId)`
2.  `decode(uint256 tokenId) returns (<TokenName>)`
3.  `is<TokenName> returns (bool)`

where `<TokenName>` can be a struct (like Artifacts or Spaceships) or just a uint256 (like Silver).

Additionally methods can be added to each library, but they must be `internal` functions that can be
inlined into other facets or libraries.

## Artifacts

In Dark Forest, artifacts are fungible. If I have two Epic Monoliths found in the Ocean biome, I can
sell either one and they have the same buffs for planets.

Thus, we can represent in this information with the following encoding:

> | TokenType.Artifact | ArtifactRarity.Epic | ArtifactType.Monolith | Biome.Ocean | ... |

In hex:

> | 0x01 | 0x03| 0x01 | 0x01 | ...

Under the hood, we simply calculate the value of the given property (Epic Artifact = 3), convert it
to hex (0x03), and place it in the appropriate location (ArtifactInfo.ArtifactRarity = 2, so place 0x03
two chunks from the left).

To decode, we just reverse this process. Given the id `0x010301010000.....`, I know that it
is an Epic Monoliths Artifact from the Ocean Biome.

You can see the actual encoding and decoding take place in `LibArtifact.sol/encode` and
`LibArtifact.sol/decode`.

### Minting

In Dark Forest, when Artifacts are minted, they are placed on the planet they were found on, _but
they are still owned by the core game contract_. From the eyes of the game contract, it will just
own bunch of Epic Monoliths. However, we have an additional data structure,
`mapping(uint256 =>uint256[]) planetArtifacts;` in the contract storage that keeps track of which
artifacts are on which planet.

If you own the planet that contains an Artifact, you can move that Artifact. This means that players
can lose access to their artifacts if the planet it is on gets captured.

### Withdrawing

For players to gain ownership over their Aritifacts, they must withdraw them from a Spacetime Rip.

Under the hood, this decreases the number of Epic Monoliths owned by the core game contract by 1 and
increases the number of Epic Monoliths owned by the player by 1. It also removes _one_ instance of
the Epic Monolith tokenId from the `planetArtifacts` mapping.

Players can now transfer or burn the Artifact.

### Transferring

ERC1155 Transfers function just like ERC721 transfers, but can also specify an amount of tokens to
transfer.

If I wanted to send _two_ Epic Monoliths to a friend, I would call the following:
`safeTransferFrom(me,myFriend,epicMonolithId, 2, "")`

## Spaceships

Spaceships are very similar to Artifacts, in that they give special powers to planets.

Spaceships are _non-fungible_. If I have two Epic Monoliths on a planet and you capture the
planet, you control the Monoliths. However, if I have my Mothership on your planet and you have your Mothership on
your planet, you cannot control my Mothership. This means that the `planetArtifacts` mapping above
will fail to enforce this primary rule of Spaceships. To fix this, each Spaceship must have a unique
id and be owned by the account that minted it.

To differentiate between Spaceships and Artifacts, we have an additional data structure,
`mapping(uint256 =>uint256[]) planetSpaceships;` in the contract storage that keeps track of which
spaceships are on which planet.

However, we can still use our `tokenId` chunk system because we don't need all 256 bits to uniquely
identify a Spaceship. We limit Spaceships to the first 16 chunks (128 bits) and save 128 for a
unique id. This uses the [Split-Id](https://eips.ethereum.org/EIPS/eip-1155#split-id-bits) method
recommended in the ERC1155 Proposal.

A Mothership Spaceship is represented like so

> | TokenType.Spaceship | SpaceshipType.ShipMothership | ... chunk 16 | uniqueId (16 chunks) |

In hex:

> | 0x02 | 0x01 ... | uniqueId (16 chunks) |

A Spaceship's tokenId = `<uint128 tokenInfo><uint128 uniqueId>`

### Minting

When a user creates or mints a Spaceship, they own it, not the contract.

Lets say my Mothership has id `<0x02000a00><0x01>`.

`balances[0x02000a00...01][myAddress] = 1`.

If Velorum mints their own Mothership, it would have id: `<0x02000a00><0x02>`.

`balances[0x02000a00...01][myAddress] = 1`.

Velorum's Mothership has the same TokenInfo, but a unique identifier at the end. This means the
contract stores my Mothership and Velorum's Mothership as completely different collections.
However, because our ships share the same first 128 bits, we can still calculate the information
about the Spaceship (SpaceshipType, TokenType) just by feeding the `LibSpaceship.decode` function the `tokenId`.

### Transferring

Right now, Spaceships cannot be transferred. This means players cannot sell their powerful ships.
This is implemented using the `beforeTokenTransfer` hook in ERC1155, which only lets the core
contract transfer Spaceships. This is used when minting a ship.

We could easily turn off this check if we wanted players to be able to buy and sell Spaceships.

## Activating

### Artifacts

Every Artifact and one Spaceship (Crescent) must be activated on a planet to be used.

The fungible nature of Artifacts creates a challenge: How do we associate data with specific
artifacts? How do I know when my Epic Monolith is activated?

There are new data structures in `LibStorage.sol` to handle this information. Because Artifact
activations are always associated with planets, we can store the needed information on the relevant planets
instead of on the Artifacts themselves.

```js
    mapping(uint256 => uint256[]) planetArtifacts;
    mapping(uint256 => uint256) planetActiveArtifact;
    mapping(uint256 => uint256) planetWormholes;
    mapping(uint256 => uint256) planetArtifactActivationTime;
```

Lets say I move my Epic Monolith with id `0xMonolith` to planet A with id `0xA`.
Now `planetArtifacts[0xA]` includes `0xMonolith`.
Now, I activate my Monolith. The following occurs:

- `planetActiveArtifact[0xA] = 0xMonolith`.
- `planetArtifactActivationTime[0xA] = block.timestamp`

If I had a Wormhole instead of a Monolith, I would also update `planetWormholes`. Lets say I want a
wormhole from `0xA` to `0xB`.

- `planetWormholes[0xA] = 0xB`

### Spaceships

- The only Spaceship that can be activated is the Crescent, and that is burned in the same
  transaction. This means that a Spaceship Id will never be added or removed to the
  `planetActiveArtifact` mapping.
- This defines a fundamental difference between Spaceships and Artifacts: Spaceship effects are
  always applied on arrival / departure, or are instanenous. There is (at the moment) no concept of
  activating them.

## Deactivating

If I deactivate my artifact from `0xA`, we simply undo these maneuvers:

- `planetActiveArtifact[0xA] = 0`.
- `planetArtifactActivationTime[0xA] = 0`

For the wormhole, we do the same:

- `planetWormholes[0xA] = 0`

## Simulteanous Activate and Deactivate

Some Artifacts (Bloom Filters) and Spaceships (Crescents) are burned on use.

All we do is make sure that we call the Activate and Deactivate functions in the same transaction.

## Photoid

For Photoid cannons, we simply apply the Photoid move if the current time is greater than the time
activated + the Photoid activation delay. If someone captures the planet, the activation time
doesn't change.

# Next Steps

## Silver

Silver is a fungible token with TokenType = 3. Although silver on planets is multiplied by 1000 for
precision, Silver the token is exact. As such, any function that converts from silver on planets to
Silver must divide by 1000.
