import {
  ClaimedCoords,
  EthAddress,
  LocationId,
  ModalId,
  ModalPosition,
  PersistedTransaction,
  RevealedCoords,
  Transaction,
  WorldLocation,
} from '@dfdao/types';
import { IDBPDatabase, openDB } from 'idb';
import stringify from 'json-stable-stringify';
import { SerializedPlugin } from '../Plugins/SerializedPlugin';

const enum ObjectStore {
  DEFAULT = 'default',
  UNCONFIRMED_ETH_TXS = 'unminedEthTxs',
  PLUGINS = 'plugins',
  /**
   * Store modal positions so that we can keep modal panes open across sessions.
   */
  MODAL_POS = 'modalPositions',
}

interface OtherStoreConfig {
  db: IDBPDatabase;
  contractAddress: EthAddress;
  account: EthAddress;
}

export const MODAL_POSITIONS_KEY = 'modal_positions';

class OtherStore {
  private db: IDBPDatabase;
  private confirmedTxHashes: Set<string>;
  private account: EthAddress;
  private contractAddress: EthAddress;

  constructor({ db, account, contractAddress }: OtherStoreConfig) {
    this.db = db;
    this.confirmedTxHashes = new Set<string>();
    this.account = account;
    this.contractAddress = contractAddress;
  }

  destroy(): void {
    // no-op; we don't actually destroy the instance, we leave the db connection open in case we need it in the future
  }

  /**
   * NOTE! if you're creating a new object store, it will not be *added* to existing dark forest
   * accounts. This creation code runs once per account. Therefore, if you're adding a new object
   * store, and need to test it out, you must either clear the indexed db databse for this account,
   * or create a brand new account.
   */
  static async create({
    account,
    contractAddress,
  }: Omit<OtherStoreConfig, 'db'>): Promise<OtherStore> {
    const db = await openDB(`darkforest-${contractAddress}-${account}`, 1, {
      upgrade(db) {
        db.createObjectStore(ObjectStore.DEFAULT);
        db.createObjectStore(ObjectStore.UNCONFIRMED_ETH_TXS);
        db.createObjectStore(ObjectStore.PLUGINS);
        db.createObjectStore(ObjectStore.MODAL_POS);
      },
    });

    const localStorageManager = new OtherStore({ db, account, contractAddress });

    return localStorageManager;
  }

  /**
   * Important! This sets the key in indexed db per account and per contract. This means the same
   * client can connect to multiple different dark forest contracts, with multiple different
   * accounts, and the persistent storage will not overwrite data that is not relevant for the
   * current configuration of the client.
   */
  private async getKey(
    key: string,
    objStore: ObjectStore = ObjectStore.DEFAULT
  ): Promise<string | undefined> {
    return await this.db.get(objStore, `${this.contractAddress}-${this.account}-${key}`);
  }

  /**
   * Important! This sets the key in indexed db per account and per contract. This means the same
   * client can connect to multiple different dark forest contracts, with multiple different
   * accounts, and the persistent storage will not overwrite data that is not relevant for the
   * current configuration of the client.
   */
  private async setKey(
    key: string,
    value: string,
    objStore: ObjectStore = ObjectStore.DEFAULT
  ): Promise<void> {
    await this.db.put(objStore, value, `${this.contractAddress}-${this.account}-${key}`);
  }

  private async removeKey(key: string, objStore: ObjectStore = ObjectStore.DEFAULT): Promise<void> {
    await this.db.delete(objStore, `${this.contractAddress}-${this.account}-${key}`);
  }

  /**
   * we keep a list rather than a single location, since client/contract can
   * often go out of sync on initialization - if client thinks that init
   * failed but is wrong, it will prompt user to initialize with new home coords,
   * which bricks the user's account.
   */
  public async getHomeLocations(): Promise<WorldLocation[]> {
    const homeLocations = await this.getKey('homeLocations');
    let parsed: WorldLocation[] = [];
    if (homeLocations) {
      parsed = JSON.parse(homeLocations) as WorldLocation[];
    }

    return parsed;
  }

  public async addHomeLocation(location: WorldLocation): Promise<void> {
    let locationList = await this.getHomeLocations();
    if (locationList) {
      locationList.push(location);
    } else {
      locationList = [location];
    }
    locationList = Array.from(new Set(locationList));
    await this.setKey('homeLocations', stringify(locationList));
  }

  public async confirmHomeLocation(location: WorldLocation): Promise<void> {
    await this.setKey('homeLocations', stringify([location]));
  }

  public async getSavedTouchedPlanetIds(): Promise<LocationId[]> {
    const touchedPlanetIds = await this.getKey('touchedPlanetIds');

    if (touchedPlanetIds) {
      const parsed = JSON.parse(touchedPlanetIds) as LocationId[];
      return parsed;
    }

    return [];
  }

  public async getSavedRevealedCoords(): Promise<RevealedCoords[]> {
    const revealedPlanetIds = await this.getKey('revealedPlanetIds');

    if (revealedPlanetIds) {
      const parsed = JSON.parse(revealedPlanetIds);
      // changed the type on 6/1/21 to include revealer field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (parsed.length === 0 || !(parsed[0] as any).revealer) {
        return [];
      }
      return parsed as RevealedCoords[];
    }

    return [];
  }
  public async getSavedClaimedCoords(): Promise<ClaimedCoords[]> {
    const claimedPlanetIds = await this.getKey('claimedPlanetIds');

    if (claimedPlanetIds) {
      const parsed = JSON.parse(claimedPlanetIds);
      // changed the type on 6/1/21 to include revealer field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (parsed.length === 0 || !(parsed[0] as any).revealer) {
        return [];
      }
      return parsed as ClaimedCoords[];
    }

    return [];
  }

  public async saveTouchedPlanetIds(ids: LocationId[]) {
    await this.setKey('touchedPlanetIds', stringify(ids));
  }

  public async saveRevealedCoords(revealedCoordTups: RevealedCoords[]) {
    await this.setKey('revealedPlanetIds', stringify(revealedCoordTups));
  }

  public async saveClaimedCoords(claimedCoordTupps: ClaimedCoords[]) {
    await this.setKey('claimedPlanetIds', stringify(claimedCoordTupps));
  }

  /**
   * Whenever a transaction is submitted, it is persisted. When the transaction either fails or
   * succeeds, it is un-persisted. The reason we persist submitted transactions is to be able to
   * wait for them upon a fresh start of the game if you close the game before a transaction
   * confirms.
   */
  public async onEthTxSubmit(tx: Transaction): Promise<void> {
    // in case the tx was mined and saved already
    if (!tx.hash || this.confirmedTxHashes.has(tx.hash)) return;
    const ser: PersistedTransaction = { hash: tx.hash, intent: tx.intent };
    await this.db.put(ObjectStore.UNCONFIRMED_ETH_TXS, JSON.parse(JSON.stringify(ser)), tx.hash);
  }

  /**
   * Partner function to {@link OtherStore#onEthTxSubmit}
   */
  public async onEthTxComplete(txHash: string): Promise<void> {
    this.confirmedTxHashes.add(txHash);
    await this.db.delete(ObjectStore.UNCONFIRMED_ETH_TXS, txHash);
  }

  public async getUnconfirmedSubmittedEthTxs(): Promise<PersistedTransaction[]> {
    const ret: PersistedTransaction[] = await this.db.getAll(ObjectStore.UNCONFIRMED_ETH_TXS);
    return ret;
  }

  public async loadPlugins(): Promise<SerializedPlugin[]> {
    const savedPlugins = await this.getKey('plugins', ObjectStore.PLUGINS);

    if (!savedPlugins) {
      return [];
    }

    return JSON.parse(savedPlugins) as SerializedPlugin[];
  }

  public async savePlugins(plugins: SerializedPlugin[]): Promise<void> {
    await this.setKey('plugins', JSON.stringify(plugins), ObjectStore.PLUGINS);
  }

  public async saveModalPositions(modalPositions: Map<ModalId, ModalPosition>): Promise<void> {
    if (!this.db.objectStoreNames.contains(ObjectStore.MODAL_POS)) return;
    const serialized = JSON.stringify(Array.from(modalPositions.entries()));
    await this.setKey(MODAL_POSITIONS_KEY, serialized, ObjectStore.MODAL_POS);
  }

  public async loadModalPositions(): Promise<Map<ModalId, ModalPosition>> {
    if (!this.db.objectStoreNames.contains(ObjectStore.MODAL_POS)) return new Map();
    const winPos = await this.getKey(MODAL_POSITIONS_KEY, ObjectStore.MODAL_POS);
    return new Map(winPos ? JSON.parse(winPos) : null);
  }
}

export default OtherStore;
