import type {
  AppMode,
  InputSample,
  Platform,
  Session,
  SessionRecorderStatus
} from "../types";
import { pressedButtonIndexes, readPrimaryGamepadSnapshot } from "./gamepadService";
import { storageService } from "./storageService";

export interface StartSessionInput {
  mode: AppMode;
  platform: Platform;
  gameName: string;
}

export function shouldRecordTelemetry(controllerConnected: boolean) {
  return controllerConnected;
}

export class SessionRecorder {
  private intervalId: number | undefined;
  private samples: InputSample[] = [];
  private session: Session | undefined;
  private startedAtMs = 0;
  private pausedAtMs = 0;
  private pausedTotalMs = 0;
  status: SessionRecorderStatus = "idle";

  async start(input: StartSessionInput) {
    const snapshot = readPrimaryGamepadSnapshot();
    const hasControllerTelemetry = shouldRecordTelemetry(snapshot.connected);

    this.startedAtMs = Date.now();
    this.pausedTotalMs = 0;
    this.samples = [];
    this.status = hasControllerTelemetry ? "recording" : "stopped";
    this.session = {
      id: crypto.randomUUID(),
      mode: input.mode,
      platform: input.platform,
      gameName: input.gameName,
      startedAt: new Date(this.startedAtMs).toISOString(),
      controllerId: snapshot.id,
      hasControllerTelemetry
    };

    await storageService.saveSession(this.session);

    if (hasControllerTelemetry) {
      this.intervalId = window.setInterval(() => this.captureSample(), 50);
    }

    return this.session;
  }

  pause() {
    if (this.status !== "recording") return;
    this.status = "paused";
    this.pausedAtMs = Date.now();
    if (this.intervalId) window.clearInterval(this.intervalId);
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "recording";
    this.pausedTotalMs += Date.now() - this.pausedAtMs;
    this.intervalId = window.setInterval(() => this.captureSample(), 50);
  }

  async stop() {
    if (!this.session) return undefined;
    if (this.intervalId) window.clearInterval(this.intervalId);
    this.status = "stopped";

    const endedAtMs = Date.now();
    const updated: Session = {
      ...this.session,
      endedAt: new Date(endedAtMs).toISOString(),
      durationSeconds: Math.max(
        0,
        Math.round((endedAtMs - this.startedAtMs - this.pausedTotalMs) / 1000)
      )
    };

    await storageService.saveSession(updated);
    await storageService.saveInputSamples(this.samples);
    this.session = updated;
    return updated;
  }

  getSamples() {
    return this.samples;
  }

  getSession() {
    return this.session;
  }

  private captureSample() {
    if (!this.session || this.status !== "recording") return;
    const snapshot = readPrimaryGamepadSnapshot();
    if (!snapshot.connected) return;

    this.samples.push({
      id: crypto.randomUUID(),
      sessionId: this.session.id,
      timestamp: Date.now(),
      leftStickX: snapshot.leftStickX,
      leftStickY: snapshot.leftStickY,
      rightStickX: snapshot.rightStickX,
      rightStickY: snapshot.rightStickY,
      leftTrigger: snapshot.leftTrigger,
      rightTrigger: snapshot.rightTrigger,
      buttons: pressedButtonIndexes(snapshot)
    });
  }
}
