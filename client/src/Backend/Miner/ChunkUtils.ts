import type { Abstract } from '@dfdao/types';
import { Chunk, Rectangle, WorldCoords, WorldLocation } from '@dfdao/types';
import { Map } from 'yjs';

/**
 * one of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
 */
type BucketId = Abstract<string, 'BucketId'>;
type ChunkId = Abstract<string, 'ChunkId'>;

/**
 * Abstract interface shared between different types of chunk stores. Currently we have one that
 * writes to IndexedDB, and one that simply throws away the data.
 */
export interface ChunkStore {
  hasMinedChunk: (chunkFootprint: Rectangle) => boolean;
}

/**
 * Deterministically assigns a bucket ID to a rectangle, based on its position and size in the
 * universe. This is kind of like a shitty hash function. Its purpose is to distribute chunks
 * roughly evenly between the buckets.
 */
export function getBucket(chunk: Rectangle): BucketId {
  const alphanumeric = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum =
    (Math.floor(chunk.bottomLeft.x / chunk.sideLength) +
      Math.floor(chunk.bottomLeft.y / chunk.sideLength)) %
    alphanumeric.length;
  if (sum < 0) sum += alphanumeric.length;
  return alphanumeric[sum] as BucketId;
}

/**
 * A unique ID generated for each chunk based on its rectangle, as well as its bucket. It's the
 * primary key by which chunks are identified.
 */
export function getChunkKey(chunkLoc: Rectangle): ChunkId {
  return (`${getBucket(chunkLoc)},` +
    `${chunkLoc.sideLength},` +
    `${chunkLoc.bottomLeft.x},` +
    `${chunkLoc.bottomLeft.y}`) as ChunkId;
}

/**
 * An aligned chunk is one whose corner's coordinates are multiples of its side length, and its side
 * length is a power of two between {@link MIN_CHUNK_SIZE} and {@link MAX_CHUNK_SIZE} inclusive.
 *
 * "Aligned" chunks is that they can be merged into other aligned chunks. Non-aligned chunks cannot
 * always be merged into squares. The reason we care about merging is that merging chunks allows us
 * to represent more world-space using fewer chunks. This saves memory at both runtime and
 * storage-time. Therefore, we only store aligned chunks.
 *
 * As an example, chunks with any corner at (0, 0) are always aligned. A chunk with side length 4 is
 * aligned if it's on (4, 4), (8, 12), but not (4, 6).
 *
 * This function returns the other three chunks with the same side length of the given chunk, such
 * that the four chunks, if merged, would result in an "aligned" chunk whose side length is double
 * the given chunk.
 */
function getSiblingLocations(chunkLoc: Rectangle): [Rectangle, Rectangle, Rectangle] {
  const doubleSideLen = 2 * chunkLoc.sideLength;
  const newBottomLeftX = Math.floor(chunkLoc.bottomLeft.x / doubleSideLen) * doubleSideLen;
  const newBottomLeftY = Math.floor(chunkLoc.bottomLeft.y / doubleSideLen) * doubleSideLen;
  const newBottomLeft = { x: newBottomLeftX, y: newBottomLeftY };

  const siblingLocs: Rectangle[] = [];

  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      const x = newBottomLeft.x + i * chunkLoc.sideLength;
      const y = newBottomLeft.y + j * chunkLoc.sideLength;

      if (x === chunkLoc.bottomLeft.x && y === chunkLoc.bottomLeft.y) {
        continue;
      }

      siblingLocs.push({
        bottomLeft: { x, y },
        sideLength: chunkLoc.sideLength,
      });
    }
  }
  return [siblingLocs[0], siblingLocs[1], siblingLocs[2]];
}

/**
 * Returns the unique aligned chunk (for definition of "aligned" see comment on
 * `getSiblingLocations`) with the given side length that contains the given point. A chunk contains
 * all of the points strictly inside of its bounds, as well as the bottom and left edges. This means
 * it does not contain points which are on its right or top edges.
 */
export function getChunkOfSideLengthContainingPoint(
  coords: WorldCoords,
  sideLength: number
): Rectangle {
  return {
    sideLength,
    bottomLeft: {
      x: Math.floor(coords.x / sideLength) * sideLength,
      y: Math.floor(coords.y / sideLength) * sideLength,
    },
  };
}

/**
 * At a high level, call this function to update an efficient quadtree-like store containing all of
 * the chunks that a player has either mined or imported in their client.
 *
 * More specifically, adds the given new chunk to the given map of chunks. If the map of chunks
 * contains all of the "sibling" chunks to this new chunk, then instead of adding it, we merge the 4
 * sibling chunks, and add the merged chunk to the map and remove the existing sibling chunks. This
 * function is recursive, which means that if the newly created merged chunk can also be merged with
 * its siblings, then we merge it, add the new larger chunk, and also remove the previously existing
 * sibling chunks.
 *
 * The maximum chunk size is represented by the `maxChunkSize` parameter (which has to be a power of
 * two). If no `maxChunkSize` parameter is provided, then there is no maxmimum chunk size, meaning
 * that chunks will be merged until no further merging is possible.
 *
 * `onAdd` and `onRemove` are called for each of the chunks that we add and remove to/from the
 * `existingChunks` map. `onAdd` will be called exactly once, whereas `onRemove` only ever be called
 * for sibling chunks that existed prior to this function being called.
 */
export function processChunkInMap(
  existingChunks: Map<Chunk>,
  chunk: Chunk,
  onAdd: (arg: Chunk) => void,
  onRemove: (arg: Chunk) => void,
  maxChunkSize?: number
) {
  for (
    let clearingSideLen = 16;
    clearingSideLen < chunk.chunkFootprint.sideLength;
    clearingSideLen *= 2
  ) {
    for (let x = 0; x < chunk.chunkFootprint.sideLength; x += clearingSideLen) {
      for (let y = 0; y < chunk.chunkFootprint.sideLength; y += clearingSideLen) {
        const queryChunk: Rectangle = {
          bottomLeft: {
            x: chunk.chunkFootprint.bottomLeft.x + x,
            y: chunk.chunkFootprint.bottomLeft.y + y,
          },
          sideLength: clearingSideLen,
        };
        const queryChunkKey = getChunkKey(queryChunk);
        const exploredChunk = existingChunks.get(queryChunkKey);
        if (exploredChunk) {
          onRemove(exploredChunk);
        }
      }
    }
  }

  let sideLength = chunk.chunkFootprint.sideLength;
  let chunkToAdd: Chunk = {
    chunkFootprint: {
      bottomLeft: chunk.chunkFootprint.bottomLeft,
      sideLength,
    },
    planetLocations: [...chunk.planetLocations],
    perlin: chunk.perlin,
  };
  while (!maxChunkSize || sideLength < maxChunkSize) {
    const siblingLocs = getSiblingLocations(chunkToAdd.chunkFootprint);
    let siblingsMined = true;
    for (const siblingLoc of siblingLocs) {
      if (!existingChunks.get(getChunkKey(siblingLoc))) {
        siblingsMined = false;
        break;
      }
    }
    if (!siblingsMined) break;
    sideLength *= 2;
    let planetLocations: WorldLocation[] = chunkToAdd.planetLocations;
    let newPerlin = chunkToAdd.perlin / 4;
    for (const siblingLoc of siblingLocs) {
      const siblingKey = getChunkKey(siblingLoc);
      const sibling = existingChunks.get(siblingKey);
      if (sibling) {
        onRemove(sibling);
        planetLocations = planetLocations.concat(sibling.planetLocations);
        newPerlin += sibling.perlin / 4;
      }
    }
    const chunkFootprint = getChunkOfSideLengthContainingPoint(
      chunkToAdd.chunkFootprint.bottomLeft,
      sideLength
    );
    chunkToAdd = {
      chunkFootprint,
      planetLocations,
      perlin: Math.floor(newPerlin * 1000) / 1000,
    };
  }
  onAdd(chunkToAdd);
}
