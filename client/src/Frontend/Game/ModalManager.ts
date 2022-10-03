import { monomitter, Monomitter } from '@dfdao/events';
import { CursorState, ModalId, ModalManagerEvent, ModalPosition, WorldCoords } from '@dfdao/types';
import { EventEmitter } from 'events';
import OtherStore from '../../Backend/Storage/OtherStore';

class ModalManager extends EventEmitter {
  static instance: ModalManager;
  private lastIndex: number;
  private cursorState: CursorState;
  private store: OtherStore;
  private modalPositions: Map<ModalId, ModalPosition>;

  public modalPositions$: Monomitter<Map<ModalId, ModalPosition>>;
  public readonly activeModalId$: Monomitter<string>;
  public readonly modalPositionChanged$: Monomitter<ModalId>;

  private constructor(store: OtherStore, modalPositions: Map<ModalId, ModalPosition>) {
    super();
    this.lastIndex = 0;
    this.activeModalId$ = monomitter(true);
    this.modalPositionChanged$ = monomitter();
    this.store = store;
    this.modalPositions = modalPositions;
  }

  public static async create(store: OtherStore): Promise<ModalManager> {
    const modalPositions = await store.loadModalPositions();
    return new ModalManager(store, modalPositions);
  }

  public getIndex(): number {
    this.lastIndex++;
    return this.lastIndex;
  }

  public getCursorState(): CursorState {
    return this.cursorState;
  }

  public setCursorState(newstate: CursorState): void {
    this.cursorState = newstate;
    this.emit(ModalManagerEvent.StateChanged, newstate);
  }

  public acceptInputForTarget(input: WorldCoords): void {
    if (this.cursorState !== CursorState.TargetingExplorer) return;
    this.emit(ModalManagerEvent.MiningCoordsUpdate, input);
    this.setCursorState(CursorState.Normal);
  }

  public getModalPosition(modalId: ModalId): ModalPosition | undefined {
    return this.modalPositions.get(modalId);
  }

  public getModalPositions(modalIds: ModalId[] = []): Map<ModalId, ModalPosition> {
    if (modalIds.length === 0) return this.modalPositions;
    return modalIds.reduce<Map<ModalId, ModalPosition>>((acc, cur) => {
      const winPos = this.modalPositions.get(cur);
      if (!winPos) return acc;
      return acc.set(cur, winPos);
    }, new Map());
  }

  public clearModalPosition(modalId: ModalId): void {
    this.modalPositions.delete(modalId);
    this.store.saveModalPositions(this.modalPositions);
    this.modalPositionChanged$.publish(modalId);
  }

  public setModalPosition(modalId: ModalId, pos: ModalPosition): void {
    this.modalPositions.set(modalId, pos);
    this.store.saveModalPositions(this.modalPositions);
    this.modalPositionChanged$.publish(modalId);
  }

  public setModalState(modalId: ModalId, state: ModalPosition['state']): void {
    const pos = this.modalPositions.get(modalId);
    if (pos) {
      this.setModalPosition(modalId, {
        ...pos,
        state,
      });
    } else {
      this.setModalPosition(modalId, {
        modalId,
        state,
      });
    }
  }
}

export default ModalManager;
