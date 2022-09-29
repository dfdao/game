# Dark Forest Tokens (ERC1155):

Each token in Dark Forest is a collection under the ERC1155 Standard.

Each collection has a `tokenId` can be fungible (supply > 1) or non-fungible (supply = 1).

The fundamental data structure in ERC1155 is `mapping(uint256 => mapping(address => uint256)) balances;`.

`balances[tokenId][myAddress]` = number of tokens I have of a given collection.

The `uint 256 tokenId`, which identifies a _set_ of tokens, is represented in the following way:

Each `uint256 tokenId` is broken down into 32 chunks of 8 bits each (32\*8 = 256).

> | chunk1 | chunk 2 | ... chunk32 |.

Chunks are used from left to right, so a token that has a value of `0xff` in chunk1 looks like`0xff00000000000000000000000000000000000000000000000000000000000000`

Another way to visualize the `tokenId` is by highlighting each chunk: `0x**ff**_00_**00**_00_**00**_00_...`

Each chunk allows for 2^8 (256) unique pieces of information. If you need more than 256 properties of a token, you can use an additional chunk

This architecture allows us to encode information about a Dark Forest token in the `tokenId` itself,
and, more importantly, it allows to create a copy of a token just by using the same `tokenId`.

This concept will become clearer as we examine how these rules are used for Artifacts and
Spaceships.

In `DFTypes.sol`, the `TokenInfo` enum looks like this:

```js
enum TokenInfo {
    Unknown,
    CollectionType,
    ArtifactRarity,
    ArtifactType,
    Biome
}
```

Each index in `TokenInfo` refers to a chunk in the `tokenId`.

> | CollectionType | ArtifactRarity | ArtifactType | Biome | chunk5 | ... chunk 32 |

Each of these chunks has 256 options. So you can have 256 Artifact Rarities, Types, Biomes etc...
This should be plenty, but if you need more you just use another chunk.

## Artifacts

In Dark Forest, artifacts are fungible. If I have two Epic Monoliths found in the Ocean biome, I can
sell either one and they have the same buffs for planets.

Thus, we can represent in this information with the following encoding:

> | CollectionType.Artifact | ArtifactRarity.Epic | ArtifactType.Monolith | Biome.Ocean | ... |

In hex:

> | 0x01 | 0x03| 0x01 | 0x01 | ...

Under the hood, we simply calculate the value of the given property (Epic Artifact = 3), convert it
to hex (0x03), and place it in the appropriate location (TokenInfo.ArtifactRarity = 2, so place 0x03
two chunks from the left).

To decode, we just reverse this process. Given the id `0x010301010000.....`, I know that it
is an Epic Monoliths Artifact from the Ocean Biome.

You can see the actual encoding and decoding take place in `DFToken.sol/encodeArtifact` and
`DFToken.sol/decode Artifact`.

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

However, we can still use our `tokenId` chunk system because we don't need all 256 bits to uniquely
identify a Spaceship. We limit Spaceships to the first 16 chunks (128 bits) and save 128 for a
unique id. This uses the [Split-Id](https://eips.ethereum.org/EIPS/eip-1155#split-id-bits) method
recommended in the ERC1155 Proposal.

A Mothership Spaceship is represented like so

> | CollectionType.Spaceship | ArtifactRarity.Unknown | ArtifactType.ShipMothership | Biome.Unknown
> | ... chunk 16 | uniqueId (16 chunks) |

In hex:

> | 0x02 | 0x00 | 0x0a | 0x00 | ... | uniqueId (16 chunks) |

A Spaceship's tokenId = `uint128 tokenInfo` + `uint128 uniqueId`

### Minting

When a user creates or mints a Spaceship, they own it, not the contract.

Lets say my Mothership has id `<0x02000a00><0x01>`.

`balances[0x02000a00...01][myAddress] = 1`.

If Velorum mints their own Mothership, it would have id: `<0x02000a00><0x02>`.

`balances[0x02000a00...01][myAddress] = 1`.

Velorum's Mothership has the same TokenInfo, but a unique identifier at the end. This means the
contract stores my Mothership and Velorum's Mothership as completely different collections.
However, because our ships share the same first 128 bits, we can still calculate the information
about the Spaceship (ArtifactType, CollectionType) just by feeding the `decodeArtifact` function the `tokenId`.

### Transferring

Right now, Spaceships cannot be transferred. This means players cannot sell their powerful ships.
This is implemented using the `beforeTokenTransfer` hook in ERC1155, which only lets the core
contract transfer Spaceships. This is used when minting a ship.

We could easily turn off this check if we wanted players to be able to buy and sell Spaceships.

## Activating

Every Artifact and one Spaceship (Crescent) must be activated on a planet to be used.

## Deactiving

# Next Steps

## Silver

We can give silver a `tokenId` as well. This would be useful it silver was a fungible resource that
could be used to buy multiple things in game. Easy enough to make it non-transferrable as well.
