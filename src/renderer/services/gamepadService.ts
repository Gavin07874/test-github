import type { ControllerSample } from "../types";
import { makeId } from "./id";

export interface GamepadSnapshot {
  connected: boolean;
  id?: string;
  timestamp: number;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  leftTrigger: number;
  rightTrigger: number;
  axes: number[];
  buttons: Array<{ index: number; pressed: boolean; touched: boolean; value: number }>;
}

export const emptySnapshot: GamepadSnapshot = {
  connected: false,
  timestamp: 0,
  leftX: 0,
  leftY: 0,
  rightX: 0,
  rightY: 0,
  leftTrigger: 0,
  rightTrigger: 0,
  axes: [],
  buttons: []
};

export function normalizeAxis(value: number, deadzone = 0.04) {
  if (Math.abs(value) < deadzone) return 0;
  return Number(value.toFixed(4));
}

export function readGamepadSnapshot(): GamepadSnapshot {
  if (typeof navigator === "undefined" || !("getGamepads" in navigator)) {
    return emptySnapshot;
  }
  const gamepad = Array.from(navigator.getGamepads()).find(Boolean);
  if (!gamepad) return emptySnapshot;
  const axes = Array.from(gamepad.axes).map((axis) => Number(axis.toFixed(4)));
  const buttons = gamepad.buttons.map((button, index) => ({
    index,
    pressed: button.pressed,
    touched: button.touched,
    value: Number(button.value.toFixed(3))
  }));

  return {
    connected: true,
    id: gamepad.id,
    timestamp: gamepad.timestamp,
    leftX: normalizeAxis(axes[0] ?? 0),
    leftY: normalizeAxis(axes[1] ?? 0),
    rightX: normalizeAxis(axes[2] ?? 0),
    rightY: normalizeAxis(axes[3] ?? 0),
    leftTrigger: Number((buttons[6]?.value ?? 0).toFixed(3)),
    rightTrigger: Number((buttons[7]?.value ?? 0).toFixed(3)),
    axes,
    buttons
  };
}

export function toControllerSample(sessionId: string, snapshot: GamepadSnapshot): ControllerSample {
  return {
    id: makeId("controller-sample"),
    sessionId,
    timestamp: Date.now(),
    connected: snapshot.connected,
    controllerId: snapshot.id,
    leftX: snapshot.leftX,
    leftY: snapshot.leftY,
    rightX: snapshot.rightX,
    rightY: snapshot.rightY,
    leftTrigger: snapshot.leftTrigger,
    rightTrigger: snapshot.rightTrigger,
    buttons: snapshot.buttons
      .filter((button) => button.pressed || button.value > 0.45)
      .map((button) => button.index)
  };
}

export function startGamepadLoop(onSnapshot: (snapshot: GamepadSnapshot) => void) {
  let frame = 0;
  let running = true;
  const tick = () => {
    if (!running) return;
    onSnapshot(readGamepadSnapshot());
    frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);
  return () => {
    running = false;
    if (frame) window.cancelAnimationFrame(frame);
  };
}
