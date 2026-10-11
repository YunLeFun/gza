import { GAMEPAD_INPUT as CONFIG } from "../config/input";

export type MenuDirection = "up" | "down" | "left" | "right";
export interface PadState {
  accelerate: boolean; brake: boolean; handbrake: boolean; reverse: boolean; steerAxis: number; moveAxis: number;
  lookX: number; lookY: number;
}
export const neutralPad = (): PadState => ({ accelerate: false, brake: false, handbrake: false, reverse: false, steerAxis: 0, moveAxis: 0, lookX: 0, lookY: 0 });
export type PadStatus = "unavailable" | "disconnected" | "unsupported" | "connected";
export const GAMEPAD_STATUS_EVENT = "dayun-kicker:gamepad-status";
let status: { status: PadStatus; active: boolean } = { status: "disconnected", active: false };
export const getGamepadStatus = () => status;
export function publishGamepadStatus(next: typeof status) {
  if (status.status === next.status && status.active === next.active) return;
  status = next;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(GAMEPAD_STATUS_EVENT));
}

export function deadzone(value: number, zone: number = CONFIG.deadzone): number {
  if (!Number.isFinite(value) || Math.abs(value) <= zone) return 0;
  return Math.sign(value) * Math.min(1, (Math.abs(value) - zone) / (1 - zone));
}

/** Poll each display tick, including menus; physical edges survive gameplay resets. */
export class GamepadPoller {
  private identity = "";
  private held = new Set<number>();
  private direction: MenuDirection | null = null;
  private repeatAt = 0;
  private meleeShoulders = new Set<number>();

  suspend() { this.identity = ""; this.held.clear(); this.meleeShoulders.clear(); this.direction = null; }

  poll(pads: readonly (Gamepad | null)[], now: number) {
    const connected = pads.filter((pad): pad is Gamepad => Boolean(pad?.connected));
    const pad = connected.find(p => `${p.index}:${p.id}` === this.identity && p.mapping === "standard")
      ?? connected.find(p => p.mapping === "standard");
    if (!pad) {
      this.suspend();
      return { status: connected.length ? "unsupported" as const : "disconnected" as const, state: neutralPad(), melee: false, pressed: [] as number[], direction: null as MenuDirection | null };
    }
    const down = new Set(pad.buttons.flatMap((button, index) => button.pressed || button.value > CONFIG.triggerThreshold ? [index] : []));
    const identity = `${pad.index}:${pad.id}`;
    const changed = this.identity !== identity;
    const pressed = changed ? [] : [...down].filter(index => !this.held.has(index));
    this.identity = identity; this.held = down;
    const axis = (index: number) => pad.axes[index] ?? 0;
    const b = CONFIG.buttons;
    if (changed) this.meleeShoulders.clear();
    const melee = down.has(b.meleeModifier);
    for (const shoulder of [b.kickLeft, b.kickRight]) {
      if (!down.has(shoulder)) this.meleeShoulders.delete(shoulder);
      else if (melee) this.meleeShoulders.add(shoulder);
    }
    const direction: MenuDirection | null = down.has(b.up) || axis(1) < -CONFIG.navigationThreshold ? "up"
      : down.has(b.down) || axis(1) > CONFIG.navigationThreshold ? "down"
      : down.has(b.left) || axis(0) < -CONFIG.navigationThreshold ? "left"
      : down.has(b.right) || axis(0) > CONFIG.navigationThreshold ? "right" : null;
    let navigate: MenuDirection | null = null;
    if (changed) { this.direction = direction; this.repeatAt = now + CONFIG.repeatDelayMs; }
    else if (direction !== this.direction) {
      navigate = direction; this.direction = direction; this.repeatAt = now + CONFIG.repeatDelayMs;
    } else if (direction && now >= this.repeatAt) {
      navigate = direction; this.repeatAt = now + CONFIG.repeatIntervalMs;
    }
    const state: PadState = changed ? neutralPad() : {
      accelerate: down.has(b.accelerate), brake: down.has(b.brake), reverse: down.has(b.brake),
      handbrake: down.has(b.handbrake) && !this.meleeShoulders.has(b.handbrake),
      steerAxis: deadzone(axis(0)), moveAxis: axis(1), lookX: deadzone(axis(2), CONFIG.lookDeadzone), lookY: deadzone(axis(3), CONFIG.lookDeadzone),
    };
    return { status: "connected" as const, state, melee: !changed && melee, pressed, direction: navigate };
  }
}
