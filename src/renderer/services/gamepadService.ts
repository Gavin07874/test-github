import type { GamepadButtonState, GamepadSnapshot } from "../types";

export const emptyGamepadSnapshot: GamepadSnapshot = {
  connected: false,
  timestamp: 0,
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0,
  rightStickY: 0,
  leftTrigger: 0,
  rightTrigger: 0,
  axes: [],
  buttons: []
};

export function normalizeAxis(value: number, deadzone = 0.04) {
  if (Math.abs(value) < deadzone) return 0;
  return Number(value.toFixed(4));
}

function buttonStates(gamepad: Gamepad): GamepadButtonState[] {
  return gamepad.buttons.map((button, index) => ({
    index,
    pressed: button.pressed,
    touched: button.touched,
    value: Number(button.value.toFixed(3))
  }));
}

export function getConnectedGamepads() {
  if (typeof navigator === "undefined") return [];
  if (!("getGamepads" in navigator)) return [];
  return Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[];
}

export function readPrimaryGamepadSnapshot(): GamepadSnapshot {
  const [gamepad] = getConnectedGamepads();
  if (!gamepad) return emptyGamepadSnapshot;

  const axes = Array.from(gamepad.axes).map((axis) => Number(axis.toFixed(4)));
  const buttons = buttonStates(gamepad);

  return {
    connected: true,
    id: gamepad.id,
    index: gamepad.index,
    timestamp: gamepad.timestamp,
    leftStickX: normalizeAxis(axes[0] ?? 0),
    leftStickY: normalizeAxis(axes[1] ?? 0),
    rightStickX: normalizeAxis(axes[2] ?? 0),
    rightStickY: normalizeAxis(axes[3] ?? 0),
    leftTrigger: Number((buttons[6]?.value ?? 0).toFixed(3)),
    rightTrigger: Number((buttons[7]?.value ?? 0).toFixed(3)),
    axes,
    buttons
  };
}

export function startGamepadLoop(onSnapshot: (snapshot: GamepadSnapshot) => void) {
  let frame = 0;
  let running = true;

  const tick = () => {
    if (!running) return;
    onSnapshot(readPrimaryGamepadSnapshot());
    frame = window.requestAnimationFrame(tick);
  };

  frame = window.requestAnimationFrame(tick);

  return () => {
    running = false;
    if (frame) window.cancelAnimationFrame(frame);
  };
}

export function pressedButtonIndexes(snapshot: GamepadSnapshot) {
  return snapshot.buttons
    .filter((button) => button.pressed || button.value > 0.5)
    .map((button) => button.index);
}
