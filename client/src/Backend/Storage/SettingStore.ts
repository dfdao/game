import { AutoGasSetting, EthAddress } from '@dfdao/types';
import { fetchUpdates, IndexeddbPersistence } from 'y-indexeddb';
import { Doc, Map, YMapEvent } from 'yjs';

const defaults = {
  OptOutMetrics: import.meta.env.DEV ? true : false,
  AutoApproveNonPurchaseTransactions: import.meta.env.DEV ? true : false,
  DrawChunkBorders: false,
  HighPerformanceRendering: false,
  MoveNotifications: true,
  HasAcceptedPluginRisk: import.meta.env.DEV ? true : false,
  GasFeeGwei: AutoGasSetting.Average,
  TerminalVisible: true,
  TutorialOpen: import.meta.env.PROD ? true : false,

  FoundPirates: false,
  TutorialCompleted: false,
  FoundSilver: false,
  FoundSilverBank: false,
  FoundTradingPost: false,
  FoundComet: false,
  FoundArtifact: false,
  FoundDeepSpace: false,
  FoundSpace: false,
  // prevent the tutorial and help pane popping up in development mode.
  NewPlayer: import.meta.env.PROD ? true : false,
  MiningCores: 1,
  IsMining: true,
  DisableDefaultShortcuts: false,
  ExperimentalFeatures: false,
  DisableEmojiRendering: false,
  DisableHatRendering: false,
  AutoClearConfirmedTransactionsAfterSeconds: -1,
  AutoClearRejectedTransactionsAfterSeconds: -1,
  DisableFancySpaceEffect: false,
  RendererColorInnerNebula: '#186469',
  RendererColorNebula: '#0B2B5B',
  RendererColorSpace: '#0B0F34',
  RendererColorDeepSpace: '#0B061F',
  RendererColorDeadSpace: '#11291b',
  ForceReloadEmbeddedPlugins: false,
};

export type Settings = typeof defaults;

export class SettingStore {
  #doc: Doc;
  #settings: Map<any>;
  #db: IndexeddbPersistence;

  #polling = false;
  #pollingTimer: ReturnType<typeof setInterval>;
  #pollingInterval = 1000;

  constructor(config: { account: EthAddress; contractAddress: string }) {
    this.#doc = new Doc();
    this.#settings = this.#doc.getMap('settings');

    this.#db = new IndexeddbPersistence(
      `darkforest-${config.contractAddress}-${config.account}-settings`,
      this.#doc
    );

    // Some settings can be set from another browser window. In particular, the 'auto accept
    // transaction' setting is set from multiple browser windows. As a result, the IDB can get
    // out of sync with the in-memory setting. To fix this, we can call `fetchUpdates` on the
    // IDB persistence layer to ensure changes are accurately applied
    this.#pollingTimer = setInterval(async () => {
      // If already polling, skip another fetch
      if (!this.#polling) {
        this.#polling = true;
        // This might be very non-performant but we'll see!
        await fetchUpdates(this.#db);
        this.#polling = false;
      }
    }, this.#pollingInterval);
  }

  destroy(): void {
    clearInterval(this.#pollingTimer);
    this.#doc.destroy();
  }

  /**
   * A function to await if you need to be sure all chunks have been loaded from indexeddb
   */
  async chunksLoaded(): Promise<void> {
    await this.#db.whenSynced;
  }

  get<Key extends keyof Settings, Value extends Settings[Key]>(key: Key): Value {
    return this.#settings.get(key) ?? defaults[key];
  }

  set<Key extends keyof Settings, Value extends Settings[Key]>(key: Key, value: Value) {
    this.#settings.set(key, value);
  }

  subscribe(fn: (key: keyof Settings) => void) {
    function subscription(evt: YMapEvent<any>) {
      for (const key of evt.changes.keys.keys()) {
        fn(key as keyof Settings);
      }
    }

    this.#settings.observe(subscription);

    return () => this.#settings.unobserve(subscription);
  }
}
