import { Chunk, DiagnosticUpdater, EthAddress, Rectangle } from '@dfdao/types';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Doc, Map } from 'yjs';
import { MAX_CHUNK_SIZE } from '../../Frontend/Utils/constants';
import {
  ChunkStore,
  getChunkKey,
  getChunkOfSideLengthContainingPoint,
  processChunkInMap,
} from '../Miner/ChunkUtils';

class PersistentChunkStore implements ChunkStore {
  private diagnosticUpdater?: DiagnosticUpdater;
  private doc: Doc;
  private chunkMap: Map<Chunk>;
  private db: IndexeddbPersistence;

  constructor(config: { account: EthAddress; contractAddress: string }) {
    this.doc = new Doc();
    this.chunkMap = this.doc.getMap<Chunk>('chunks');

    this.db = new IndexeddbPersistence(
      `darkforest-${config.contractAddress}-${config.account}-chunks`,
      this.doc
    );
  }

  destroy(): void {
    this.doc.destroy();
  }

  public setDiagnosticUpdater(diagnosticUpdater?: DiagnosticUpdater) {
    this.diagnosticUpdater = diagnosticUpdater;
  }

  /**
   * A function to await if you need to be sure all chunks have been loaded from indexeddb
   */
  async chunksLoaded(): Promise<void> {
    await this.db.whenSynced;
  }

  /**
   * Returns the explored chunk data for the given rectangle if that chunk has been mined. If this
   * chunk is entirely contained within another bigger chunk that has been mined, return that chunk.
   * `chunkLoc` is an aligned square, as defined in ChunkUtils.ts in the `getSiblingLocations`
   * function.
   */
  public getChunkByFootprint(chunkLoc: Rectangle): Chunk | undefined {
    let sideLength = chunkLoc.sideLength;

    while (sideLength <= MAX_CHUNK_SIZE) {
      const testChunkLoc = getChunkOfSideLengthContainingPoint(chunkLoc.bottomLeft, sideLength);
      const chunk = this.chunkMap.get(getChunkKey(testChunkLoc));
      if (chunk) {
        return chunk;
      }
      sideLength *= 2;
    }

    return undefined;
  }

  public hasMinedChunk(chunkLoc: Rectangle): boolean {
    return !!this.getChunkByFootprint(chunkLoc);
  }

  /**
   * When a chunk is mined, or a chunk is imported via map import, or a chunk is loaded from
   * persistent storage for the first time, we need to add this chunk to the game. This function
   * allows you to add a new chunk to the game, and optionally persist that chunk. The reason you
   * might not want to persist the chunk is if you are sure that you got it from persistent storage.
   * i.e. it already exists in persistent storage.
   */
  public addChunk(chunk: Chunk): void {
    if (this.hasMinedChunk(chunk.chunkFootprint)) {
      return;
    }

    this.doc.transact(() => {
      processChunkInMap(this.chunkMap, chunk, this.onAdd, this.onRemove, MAX_CHUNK_SIZE);
    });

    this.diagnosticUpdater?.updateDiagnostics((d) => {
      d.totalChunks = this.chunkMap.size;
    });
  }

  private onAdd = (chunk: Chunk) => {
    this.chunkMap.set(getChunkKey(chunk.chunkFootprint), chunk);
  };

  private onRemove = (chunk: Chunk) => {
    this.chunkMap.delete(getChunkKey(chunk.chunkFootprint));
  };

  public allChunks(): Iterable<Chunk> {
    return this.chunkMap.values();
  }
}

export default PersistentChunkStore;
