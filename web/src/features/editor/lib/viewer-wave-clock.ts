import type { ViewerPoint } from "./viewer-generated-effects";

export type ViewerWaveFrame = {
  pointer: ViewerPoint | null;
  seconds: number;
  strength: number;
};

/** One animation clock per preview, shared by all authored wave graphics.
 * Publishing geometry frames does not update React or the rest of the scene. */
export class ViewerWaveClock {
  private listeners = new Set<(frame: ViewerWaveFrame) => void>();
  private pointerListeners = new Set<(pointer: ViewerPoint | null) => void>();
  private pointer: ViewerPoint | null = null;
  private current: ViewerWaveFrame = { pointer: null, seconds: 0, strength: 0 };
  private reducedMotion = false;
  private frameId: number | null = null;
  private previous = 0;

  setPointer(pointer: ViewerPoint | null) {
    this.pointer = pointer;
    for (const listener of this.pointerListeners) listener(pointer);
    if (this.reducedMotion) this.publishReduced();
  }

  subscribePointer(listener: (pointer: ViewerPoint | null) => void) {
    this.pointerListeners.add(listener);
    listener(this.pointer);
    return () => {
      this.pointerListeners.delete(listener);
    };
  }

  setReducedMotion(reduced: boolean) {
    if (this.reducedMotion === reduced) return;
    this.reducedMotion = reduced;
    if (reduced) {
      this.stop();
      this.publishReduced();
    } else {
      this.schedule();
    }
  }

  subscribe(listener: (frame: ViewerWaveFrame) => void) {
    this.listeners.add(listener);
    listener(this.current);
    this.schedule();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.stop();
    };
  }

  private publishReduced() {
    this.current = {
      pointer: this.pointer,
      seconds: 0,
      strength: this.pointer ? 1 : 0,
    };
    this.publish();
  }

  private publish() {
    for (const listener of this.listeners) listener(this.current);
  }

  private tick = (now: number) => {
    this.frameId = null;
    if (this.reducedMotion || !this.listeners.size) return;
    const delta = Math.min(0.05, (now - (this.previous || now - 16)) / 1000);
    this.previous = now;
    const strength =
      this.current.strength +
      ((this.pointer ? 1 : 0) - this.current.strength) *
        Math.min(1, delta * 10);
    this.current = {
      pointer: this.pointer ?? this.current.pointer,
      seconds: now / 1000,
      strength: strength < 0.01 && !this.pointer ? 0 : strength,
    };
    this.publish();
    // The authored wave includes ambient movement even outside the artwork.
    this.schedule();
  };

  private schedule() {
    if (!this.reducedMotion && this.listeners.size && this.frameId === null) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private stop() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.previous = 0;
  }
}
