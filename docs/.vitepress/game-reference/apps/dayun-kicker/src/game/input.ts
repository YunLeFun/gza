import { ACTION_KEYS, LOOK_INPUT, GAMEPAD_INPUT } from "../config/input";
import type { InputSnapshot, KickSide } from "./types";
import { KickInputBuffer } from "./kickInputBuffer";
import { GamepadPoller, neutralPad, getGamepadStatus, publishGamepadStatus } from "./gamepad";
import { navigateGamepadMenu, confirmGamepadMenu, cancelGamepadMenu, switchGamepadSettingsTab } from "../ui/gamepadNavigation";

export type DigitalAction = "accelerate" | "brake" | "steerLeft" | "steerRight";

export class InputController {
  protected inputEnabled = true;
  private actions: InputSnapshot = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    steerAxis: 0,
  };

  private kickBuffer = new KickInputBuffer();
  private kickQueuedHandler: (() => void) | null = null;
  private look = { x: 0, y: 0 };
  private touchKickPointer: number | null = null;
  private smartKickResolver: (() => KickSide) | null = null;
  private canCapturePointer = () => false;
  private itemHandler: (() => void) | null = null;
  private pauseHandler: (() => void) | null = null;
  private pointerLockChangeHandler: ((locked: boolean) => void) | null = null;
  private pad = neutralPad();
  private padPoller = new GamepadPoller();
  private padTime = 0;
  private focused = true;
  private padWasPlaying = false;
  private blockPadReverse = false;
  private gamepadActiveGuard = () => this.canCapturePointer();
  private gamepadStickMovementGuard = () => false;
  private gamepadLookHandler: ((yaw: number, pitch: number) => void) | null = null;
  private gamepadShortcutHandler: ((button: number, melee: boolean) => boolean | void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly keyboardMovement = true, private readonly itemKey: string = "KeyF") {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("focus", this.onFocus);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    canvas.addEventListener("click", this.onCanvasClick);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("pointerdown", this.onCanvasPointerDown);
    canvas.addEventListener("pointerup", this.onCanvasPointerUp);
    canvas.addEventListener("pointercancel", this.onCanvasPointerUp);
    document.addEventListener("touchmove", this.preventTouchScroll, { passive: false });
    document.addEventListener("gesturestart", this.preventGesture);
  }

  setPointerCaptureGuard(guard: () => boolean) {
    this.canCapturePointer = guard;
  }

  setItemHandler(handler: () => void) {
    this.itemHandler = handler;
  }

  setPauseHandler(handler: () => void) {
    this.pauseHandler = handler;
  }

  setPointerLockChangeHandler(handler: (locked: boolean) => void) {
    this.pointerLockChangeHandler = handler;
    handler(document.pointerLockElement === this.canvas);
  }

  setSmartKickResolver(resolver: () => KickSide) {
    this.smartKickResolver = resolver;
  }

  setGamepadActiveGuard(guard: () => boolean) { this.gamepadActiveGuard = guard; }
  /** Release this mode before another gameplay mechanism takes over its inputs. */
  setEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    if (!enabled) { this.reset(); this.releasePointerLock(); }
  }
  setGamepadStickMovementGuard(guard: () => boolean) { this.gamepadStickMovementGuard = guard; }
  setGamepadLookHandler(handler: (yaw: number, pitch: number) => void) { this.gamepadLookHandler = handler; }
  setGamepadShortcutHandler(handler: (button: number, melee: boolean) => boolean | void) { this.gamepadShortcutHandler = handler; }
  protected getGamepadInput() { return this.pad; }

  pollGamepad(now: number) {
    if (!this.inputEnabled) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.padTime) / 1000));
    this.padTime = now;
    this.pad = neutralPad();
    if (document.hidden || !this.focused) {
      this.padPoller.suspend();
      publishGamepadStatus({ ...getGamepadStatus(), active: false });
      return;
    }
    let pads: (Gamepad | null)[];
    try {
      if (!navigator.getGamepads) throw new Error("Gamepad API unavailable");
      pads = [...navigator.getGamepads()];
    } catch {
      this.padPoller.suspend();
      publishGamepadStatus({ status: "unavailable", active: false });
      return;
    }
    const frame = this.padPoller.poll(pads, now);
    const engaged = frame.pressed.length > 0 || Object.values(frame.state).some(Boolean);
    publishGamepadStatus({ status: frame.status, active: frame.status === "connected" && (engaged || getGamepadStatus().active) });
    const b = GAMEPAD_INPUT.buttons;
    if (frame.pressed.includes(b.pause)) {
      if (this.gamepadActiveGuard()) this.pauseHandler?.();
      else cancelGamepadMenu();
      return;
    }
    const pressed = frame.pressed.filter(button => !this.gamepadShortcutHandler?.(button, frame.melee));
    const playing = this.gamepadActiveGuard();
    const stickMovement = this.gamepadStickMovementGuard();
    const reverse = frame.state.reverse || (stickMovement && frame.state.moveAxis > GAMEPAD_INPUT.navigationThreshold);
    if (playing && !this.padWasPlaying && reverse) this.blockPadReverse = true;
    if (!reverse) this.blockPadReverse = false;
    this.padWasPlaying = playing;
    if (!playing) {
      if (pressed.includes(b.kickLeft)) switchGamepadSettingsTab(-1);
      if (pressed.includes(b.kickRight)) switchGamepadSettingsTab(1);
      if (frame.direction) navigateGamepadMenu(frame.direction);
      if (pressed.includes(b.cancel)) cancelGamepadMenu();
      else if (pressed.includes(b.confirm)) confirmGamepadMenu();
      return;
    }
    this.pad = { ...frame.state,
      accelerate: frame.state.accelerate || (stickMovement && frame.state.moveAxis < -GAMEPAD_INPUT.navigationThreshold),
      reverse: reverse && !this.blockPadReverse,
    };
    const yaw = -frame.state.lookX * GAMEPAD_INPUT.lookRadiansPerSecond * dt;
    const pitch = -frame.state.lookY * GAMEPAD_INPUT.lookRadiansPerSecond * dt;
    if (this.gamepadLookHandler) this.gamepadLookHandler(yaw, pitch);
    else {
      this.look.x = clamp(this.look.x + yaw, LOOK_INPUT.minX, LOOK_INPUT.maxX);
      this.look.y = clamp(this.look.y + pitch, LOOK_INPUT.minY, LOOK_INPUT.maxY);
    }
    if (frame.melee && pressed.includes(b.kickLeft)) this.queueKick(-1);
    if (frame.melee && pressed.includes(b.kickRight)) this.queueKick(1);
    if (pressed.includes(b.smartKick)) this.queueSmartKick();
    if (pressed.includes(b.item)) this.itemHandler?.();
  }

  snapshot(): InputSnapshot {
    return { ...this.actions,
      accelerate: this.actions.accelerate || this.pad.accelerate,
      brake: this.actions.brake || this.pad.brake || this.pad.handbrake,
      handbrake: this.actions.brake || this.pad.handbrake,
      steerAxis: Math.abs(this.actions.steerAxis) > Math.abs(this.pad.steerAxis) ? this.actions.steerAxis : this.pad.steerAxis,
    };
  }

  peekKickSide(): KickSide | 0 {
    return this.kickBuffer.peek();
  }

  consumeKickSide() {
    this.kickBuffer.consume();
  }

  clearKickQueue() {
    this.kickBuffer.clear();
  }

  reset() {
    this.clear();
    this.pad = neutralPad();
  }

  setKickQueuedHandler(handler: () => void) {
    this.kickQueuedHandler = handler;
  }

  setDigitalAction(action: DigitalAction, active: boolean) {
    this.actions[action] = active;
  }

  setSteeringAxis(axis: number) {
    this.actions.steerAxis = clamp(axis, -1, 1);
  }

  queueKick(side: KickSide) {
    this.kickBuffer.queue(side);
    this.kickQueuedHandler?.();
  }

  queueSmartKick() {
    const side = this.smartKickResolver?.() ?? (this.look.x < 0 ? -1 : 1);
    this.queueKick(side);
  }

  getLook() {
    return this.look;
  }

  requestPointerLock() {
    if (document.pointerLockElement !== this.canvas) {
      const request = this.canvas.requestPointerLock?.();
      if (request && "catch" in request) {
        request.catch(() => {
          this.look.x *= LOOK_INPUT.releaseDamping;
          this.look.y *= LOOK_INPUT.releaseDamping;
        });
      }
    }
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("focus", this.onFocus);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    this.canvas.removeEventListener("click", this.onCanvasClick);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("pointerdown", this.onCanvasPointerDown);
    this.canvas.removeEventListener("pointerup", this.onCanvasPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onCanvasPointerUp);
    document.removeEventListener("touchmove", this.preventTouchScroll);
    document.removeEventListener("gesturestart", this.preventGesture);
  }

  private onBlur = () => { this.focused = false; this.pad = neutralPad(); this.padPoller.suspend(); };
  private onFocus = () => { this.focused = true; };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.closest("[role='dialog'],[data-game-select],[data-game-select-content]"))) return;
    if (event.isTrusted) publishGamepadStatus({ ...getGamepadStatus(), active: false });
    const action = ACTION_KEYS[event.code];
    if (action && this.keyboardMovement) {
      this.actions[action] = true;
      event.preventDefault();
      return;
    }

    if (!event.repeat && event.code === this.itemKey) {
      this.itemHandler?.();
      event.preventDefault();
    }

    if (!event.repeat && event.code === "KeyQ") {
      this.queueKick(-1);
      event.preventDefault();
    }

    if (!event.repeat && event.code === "KeyE") {
      this.queueKick(1);
      event.preventDefault();
    }

    if (!event.repeat && event.code === "Space") {
      this.queueKick(this.look.x < 0 ? -1 : 1);
      event.preventDefault();
    }

    if (!event.repeat && (event.code === "KeyP" || event.code === "Escape")) {
      this.pauseHandler?.();
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    const action = ACTION_KEYS[event.code];
    if (action && this.keyboardMovement) {
      this.actions[action] = false;
      event.preventDefault();
    }
  };

  private onMouseDown = (event: MouseEvent) => {
    if (event.isTrusted) publishGamepadStatus({ ...getGamepadStatus(), active: false });
    if (!this.canCapturePointer() || document.pointerLockElement !== this.canvas) {
      return;
    }

    if (event.button === 0) {
      this.queueKick(-1);
    } else if (event.button === 2) {
      this.queueKick(1);
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas) {
      return;
    }

    this.look.x = clamp(this.look.x - event.movementX * LOOK_INPUT.sensitivityX, LOOK_INPUT.minX, LOOK_INPUT.maxX);
    this.look.y = clamp(this.look.y - event.movementY * LOOK_INPUT.sensitivityY, LOOK_INPUT.minY, LOOK_INPUT.maxY);
  };

  private onPointerLockChange = () => {
    const locked = document.pointerLockElement === this.canvas;
    if (!locked) {
      this.look.x *= LOOK_INPUT.releaseDamping;
      this.look.y *= LOOK_INPUT.releaseDamping;
    }
    this.pointerLockChangeHandler?.(locked);
  };

  private onCanvasClick = (event: MouseEvent) => {
    if (event instanceof PointerEvent && event.pointerType === "touch") {
      return;
    }

    if (this.canCapturePointer()) {
      this.requestPointerLock();
    }
  };

  private onCanvasPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !this.canCapturePointer()) {
      return;
    }

    event.preventDefault();
    this.captureCanvasPointer(event);

    if (this.touchKickPointer !== null) {
      return;
    }

    this.touchKickPointer = event.pointerId;
  };

  private onCanvasPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      return;
    }

    if (event.pointerId === this.touchKickPointer) {
      if (event.type !== "pointercancel") {
        this.queueSmartKick();
      }
      this.touchKickPointer = null;
    }
  };

  private captureCanvasPointer(event: PointerEvent) {
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some browser-generated touch events cannot be captured by the canvas.
    }
  }

  private preventTouchScroll = (event: TouchEvent) => {
    if (this.canCapturePointer()) {
      event.preventDefault();
    }
  };

  private preventGesture = (event: Event) => {
    event.preventDefault();
  };

  private clear = () => {
    this.touchKickPointer = null;
    this.clearKickQueue();
    this.actions = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
      steerAxis: 0,
    };
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
