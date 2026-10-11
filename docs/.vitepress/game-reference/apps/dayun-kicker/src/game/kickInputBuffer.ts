import { KICK_INPUT_BUFFER_MS } from "../config/input";
import type { KickSide } from "./types";

interface BufferedKick {
  side: KickSide;
  expiresAt: number;
}

export class KickInputBuffer {
  private entries: BufferedKick[] = [];

  constructor(
    private readonly durationMs = KICK_INPUT_BUFFER_MS,
    private readonly now = () => performance.now(),
  ) {}

  queue(side: KickSide) {
    this.entries.push({ side, expiresAt: this.now() + this.durationMs });
    if (this.entries.length > 2) {
      this.entries.shift();
    }
  }

  peek(): KickSide | 0 {
    this.dropExpired();
    return this.entries[0]?.side ?? 0;
  }

  consume() {
    this.entries.shift();
  }

  clear() {
    this.entries.length = 0;
  }

  private dropExpired() {
    const now = this.now();
    while (this.entries[0] && this.entries[0].expiresAt < now) {
      this.entries.shift();
    }
  }
}
