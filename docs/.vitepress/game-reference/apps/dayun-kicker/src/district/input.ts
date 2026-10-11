import { GAMEPAD_INPUT, RIDE_KEYS, EXPLORATION_KEYS } from "../config/input";
import { InputController, type DigitalAction } from "../game/input";
import type { InputSnapshot } from "../game/types";

export type RideAction = DigitalAction | "reverse" | "jump" | "sprint";
export interface RideInput extends InputSnapshot { reverse?: boolean; jump?: boolean; sprint?: boolean }

/** Movement has district bindings; the race controller still owns kicks, items and look. */
export class DistrictInput extends InputController {
  private rideKeys = new Set<string>();
  private rideTouches = new Set<RideAction>();
  private shortcutHandler: ((button: number, melee: boolean) => boolean | void) | null = null;
  private vehicleInteractHandler: (() => void) | null = null;
  private vehicleInteractGuard = () => false;
  private blockedRideKeys = new Set<string>();
  private blockedVehiclePedals = new Set<number>();
  private blockedVehicleMove = false;
  private blockedVehicleSteer = false;
  private walkGuard = () => false;
  private jumpPending = false;

  constructor(canvas: HTMLCanvasElement) {
    // This mode owns movement bindings; the race controller keeps other input.
    super(canvas, false, EXPLORATION_KEYS.boost);
    super.setGamepadShortcutHandler((button, melee) => {
      if (this.walkGuard() && button === GAMEPAD_INPUT.buttons.confirm) { this.jumpPending = true; return true; }
      if (this.vehicleInteractHandler && this.vehicleInteractGuard()) {
        if (button === GAMEPAD_INPUT.buttons.kickRight) { this.vehicleInteractHandler(); return true; }
        // RB is reserved for vehicles; A + R3 keeps an explicit right kick.
        if (melee && button === GAMEPAD_INPUT.buttons.mirror) { this.queueKick(1); return true; }
      }
      return this.shortcutHandler?.(button, melee);
    });
    window.addEventListener("keydown", this.rideKeyboard);
    window.addEventListener("keyup", this.rideKeyboard);
    window.addEventListener("blur", this.clearRide);
    document.addEventListener("keydown", this.smartKickKeyboard);
  }
  override snapshot(): RideInput {
    // Keep each key and touch source until it releases. Releasing W cannot cancel
    // a held arrow or touch throttle, and S never leaks the race brake binding.
    const pad = this.getGamepadInput();
    const sharedVehicles = Boolean(this.vehicleInteractHandler);
    const padForward = pad.accelerate && !this.blockedVehiclePedals.has(GAMEPAD_INPUT.buttons.accelerate)
      && !(this.blockedVehicleMove && pad.moveAxis < -GAMEPAD_INPUT.navigationThreshold);
    const padReverse = sharedVehicles ? pad.reverse && pad.moveAxis > GAMEPAD_INPUT.navigationThreshold && !this.blockedVehicleMove : pad.reverse;
    const padBrake = sharedVehicles ? pad.brake && !this.blockedVehiclePedals.has(GAMEPAD_INPUT.buttons.brake) : pad.handbrake;
    const input: RideInput = {
      accelerate: this.rideTouches.has("accelerate") || padForward, brake: this.rideTouches.has("brake") || padBrake,
      steerLeft: this.rideTouches.has("steerLeft"), steerRight: this.rideTouches.has("steerRight"),
      reverse: this.rideTouches.has("reverse") || padReverse, steerAxis: this.blockedVehicleSteer ? 0 : super.snapshot().steerAxis,
      jump: this.walkGuard() && this.jumpPending,
      sprint: this.walkGuard() && (this.rideTouches.has("sprint") || this.rideKeys.has("ShiftLeft") || this.rideKeys.has("ShiftRight")
        || !!this.physicalPad()?.buttons[GAMEPAD_INPUT.buttons.turnAround]?.pressed && !this.blockedVehiclePedals.has(GAMEPAD_INPUT.buttons.turnAround)),
    };
    for (const key of this.rideKeys) if (!(this.walkGuard() && key.startsWith("Shift"))) input[RIDE_KEYS[key]!] = true;
    return input;
  }
  override setDigitalAction(action: DigitalAction, active: boolean) { this.setRideAction(action, active); }
  override setGamepadShortcutHandler(handler: (button: number, melee: boolean) => boolean | void) { this.shortcutHandler = handler; }
  setVehicleInteractHandler(handler: () => void, guard: () => boolean) { this.vehicleInteractHandler = handler; this.vehicleInteractGuard = guard; }
  setWalkGuard(guard: () => boolean) { this.walkGuard = guard; }
  consumeJump() { this.jumpPending = false; }
  override pollGamepad(now: number) {
    super.pollGamepad(now);
    const pad = this.physicalPad();
    for (const button of this.blockedVehiclePedals) if (!pad?.buttons[button]?.pressed && (pad?.buttons[button]?.value ?? 0) <= GAMEPAD_INPUT.triggerThreshold) this.blockedVehiclePedals.delete(button);
    if (Math.abs(pad?.axes[1] ?? 0) <= GAMEPAD_INPUT.navigationThreshold) this.blockedVehicleMove = false;
    if (Math.abs(pad?.axes[0] ?? 0) <= GAMEPAD_INPUT.deadzone) this.blockedVehicleSteer = false;
  }
  setRideAction(action: RideAction, active: boolean) {
    if (action === "jump" && active && !this.rideTouches.has(action) && this.walkGuard()) this.jumpPending = true;
    if (active) this.rideTouches.add(action);
    else this.rideTouches.delete(action);
  }
  override reset() {
    const heldKeys = [...this.rideKeys, ...this.blockedRideKeys];
    const pad = this.vehicleInteractHandler ? this.physicalPad() : null;
    super.reset(); this.clearRide();
    if (this.vehicleInteractHandler) for (const key of heldKeys) this.blockedRideKeys.add(key);
    if (pad) {
      for (const button of [GAMEPAD_INPUT.buttons.brake, GAMEPAD_INPUT.buttons.accelerate, GAMEPAD_INPUT.buttons.turnAround]) if (pad.buttons[button]?.pressed || (pad.buttons[button]?.value ?? 0) > GAMEPAD_INPUT.triggerThreshold) this.blockedVehiclePedals.add(button);
      this.blockedVehicleMove = Math.abs(pad.axes[1] ?? 0) > GAMEPAD_INPUT.navigationThreshold;
      this.blockedVehicleSteer = Math.abs(pad.axes[0] ?? 0) > GAMEPAD_INPUT.deadzone;
    }
  }
  override dispose() {
    window.removeEventListener("keydown", this.rideKeyboard);
    window.removeEventListener("keyup", this.rideKeyboard);
    window.removeEventListener("blur", this.clearRide);
    document.removeEventListener("keydown", this.smartKickKeyboard);
    this.reset(); super.dispose();
  }
  private smartKickKeyboard = (event: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    if (event.code !== "Space") return;
    // UI controls see the event first and keep native Space activation. Stop it
    // before the race controller's window listener can queue an additional kick.
    event.stopPropagation();
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
      (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target.tagName) || event.target.closest("[data-game-select],[data-game-select-content]")))) return;
    event.preventDefault();
    if (!event.repeat) { if (this.walkGuard()) this.jumpPending = true; else this.queueSmartKick(); }
  };
  private physicalPad() {
    try { return Array.from(navigator.getGamepads?.() ?? []).find(pad => pad?.connected && pad.mapping === "standard") ?? null; }
    catch { return null; }
  }
  private clearRide = () => { this.jumpPending = false; this.rideKeys.clear(); this.rideTouches.clear(); this.blockedRideKeys.clear(); this.blockedVehiclePedals.clear(); this.blockedVehicleMove = this.blockedVehicleSteer = false; };
  private rideKeyboard = (event: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    if (!RIDE_KEYS[event.code]) return;
    if (event.type === "keyup") this.blockedRideKeys.delete(event.code);
    if (event.type === "keydown") {
      // A held key from before pause or mounting must be released and pressed again.
      if (event.repeat && !this.rideKeys.has(event.code)) return;
      if (this.blockedRideKeys.has(event.code)) return;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.closest("[data-game-select],[data-game-select-content]")))) return;
      this.rideKeys.add(event.code);
    } else this.rideKeys.delete(event.code);
    event.preventDefault();
  };
}
