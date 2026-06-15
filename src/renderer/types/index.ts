export type AppMode = "pc" | "console_remote_play";

export type Platform =
  | "pc"
  | "playstation"
  | "xbox"
  | "nintendo_switch"
  | "other";

export interface Session {
  id: string;
  mode: AppMode;
  platform: Platform;
  gameName: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  controllerId?: string;
  hasControllerTelemetry: boolean;
}

export interface CurrentSettings {
  id: string;
  sessionId?: string;
  gameName: string;
  platform: Platform;
  horizontalSensitivity: number;
  verticalSensitivity: number;
  adsSensitivity: number;
  leftStickDeadzone: number;
  rightStickDeadzone: number;
  responseCurve: string;
  aimingSensitivityY?: number;
  scopedSensitivityX?: number;
  scopedSensitivityY?: number;
  aimingAccelerationScale?: number;
  aimingRampPowerScale?: number;
  weaponSwapInvert?: boolean;
  aimSmoothing?: number;
  fieldOfView?: number;
}

export interface InputSample {
  id: string;
  sessionId: string;
  timestamp: number;
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
  buttons: number[];
}

export interface CapturableWindowSource {
  id: string;
  name: string;
}

export type ScreenCaptureSessionStatus =
  | "running"
  | "paused"
  | "stopped"
  | "partial"
  | "error";

export interface ScreenCaptureSession {
  id: string;
  gameName: string;
  mode: AppMode;
  sourceName: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  status: ScreenCaptureSessionStatus;
}

export interface ScreenFrameMetric {
  id: string;
  sessionId: string;
  timestamp: number;
  brightness: number;
  sceneChangeScore: number;
  fullMotionScore: number;
  centerMotionScore: number;
  stabilityScore: number;
  controllerStickMagnitude: number;
  adsActive: boolean;
  fireActive: boolean;
}

export interface ScreenAnalysisSummary {
  id: string;
  sessionId: string;
  averageBrightness: number;
  averageSceneChangeScore: number;
  averageFullMotionScore: number;
  averageCenterMotionScore: number;
  averageStabilityScore: number;
  peakInstabilityScore: number;
  instabilityWindowCount: number;
  controllerScreenCorrelation: number;
  adsInstabilityScore: number;
  firingInstabilityScore: number;
  confidenceContribution: number;
  sampleCount: number;
}

export interface PostGameStats {
  id: string;
  sessionId: string;
  kills: number;
  deaths: number;
  assists?: number;
  accuracyPercent?: number;
  headshotPercent?: number;
  damage?: number;
  placement?: string;
  winLoss?: "win" | "loss" | "unknown";
  notes: string;
}

export interface CalibrationMetrics {
  id: string;
  sessionId: string;
  leftStickDriftAverage: number;
  leftStickDriftMax: number;
  rightStickDriftAverage: number;
  rightStickDriftMax: number;
  microAimOvershootRate: number;
  microAimUndershootRate: number;
  microAimSettleTime: number;
  microAimJitter: number;
  microAimAccuracy: number;
  flickReactionTime: number;
  flickOvershootRate: number;
  flickUndershootRate: number;
  flickSettleTime: number;
  maxStickUsagePercent: number;
  trackingErrorAverage: number;
  trackingErrorMax: number;
  trackingSmoothness: number;
  trackingJitter: number;
  targetLossCount: number;
  maxStickTimePercent: number;
  turnSpeedConsistency: number;
  turnCorrectionCount: number;
  adsJitter: number;
  adsOvershootRate: number;
  adsTrackingError: number;
  firingStabilityScore: number;
}

export type RecommendationSource =
  | "calibration_lab"
  | "controller_telemetry"
  | "screen_analysis"
  | "post_game_stats"
  | "user_notes"
  | "repeated_pattern";

export type RecommendationSeverity =
  | "mild"
  | "medium"
  | "severe"
  | "extreme";

export interface Recommendation {
  id: string;
  sessionId: string;
  settingName: string;
  currentValue: number | string;
  recommendedValue: number | string;
  exactDelta: number | string;
  percentChange?: number;
  confidenceScore: number;
  severity: RecommendationSeverity;
  reason: string;
  source: RecommendationSource;
  supportingMetrics: Record<string, number | string>;
}

export interface GameSettingProfile {
  gameName: string;
  platform: Platform;
  shortName: string;
  settingPath: string;
  playStyle: string;
  theme: "fortnite" | "tlou2";
  horizontalSensitivityMin: number;
  horizontalSensitivityMax: number;
  horizontalSensitivityStep: number;
  verticalSensitivityMin: number;
  verticalSensitivityMax: number;
  verticalSensitivityStep: number;
  adsSensitivityMin: number;
  adsSensitivityMax: number;
  adsSensitivityStep: number;
  deadzoneMin: number;
  deadzoneMax: number;
  deadzoneStep: number;
  responseCurveOptions: string[];
  labels: {
    horizontalSensitivity: string;
    verticalSensitivity: string;
    adsSensitivity: string;
    leftStickDeadzone: string;
    rightStickDeadzone: string;
    responseCurve: string;
    aimingSensitivityY?: string;
    scopedSensitivityX?: string;
    scopedSensitivityY?: string;
    aimingAccelerationScale?: string;
    aimingRampPowerScale?: string;
    weaponSwapInvert?: string;
    aimSmoothing: string;
    fieldOfView: string;
  };
  hints: {
    horizontalSensitivity: string;
    verticalSensitivity: string;
    adsSensitivity: string;
    leftStickDeadzone: string;
    rightStickDeadzone: string;
    responseCurve: string;
    aimingSensitivityY?: string;
    scopedSensitivityX?: string;
    scopedSensitivityY?: string;
    aimingAccelerationScale?: string;
    aimingRampPowerScale?: string;
    weaponSwapInvert?: string;
    aimSmoothing: string;
    fieldOfView: string;
  };
  defaults: {
    horizontalSensitivity: number;
    verticalSensitivity: number;
    adsSensitivity: number;
    leftStickDeadzone: number;
    rightStickDeadzone: number;
    responseCurve: string;
    aimingSensitivityY?: number;
    scopedSensitivityX?: number;
    scopedSensitivityY?: number;
    aimingAccelerationScale?: number;
    aimingRampPowerScale?: number;
    weaponSwapInvert?: boolean;
    aimSmoothing?: number;
    fieldOfView?: number;
  };
}

export interface GamepadButtonState {
  index: number;
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface GamepadSnapshot {
  connected: boolean;
  id?: string;
  index?: number;
  timestamp: number;
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
  axes: number[];
  buttons: GamepadButtonState[];
}

export type CalibrationTestId =
  | "drift"
  | "micro"
  | "flick"
  | "tracking"
  | "turn"
  | "ads";

export interface CalibrationTestDefinition {
  id: CalibrationTestId;
  title: string;
  durationSeconds: number;
  objective: string;
  metricsCollected: string[];
  telemetryRequired: boolean;
}

export interface CalibrationSample {
  testId: CalibrationTestId;
  timestamp: number;
  elapsedMs: number;
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
  buttons: number[];
  targetX?: number;
  targetY?: number;
  reticleX?: number;
  reticleY?: number;
}

export type SessionRecorderStatus =
  | "idle"
  | "recording"
  | "paused"
  | "stopped";

export interface DashboardSummary {
  totalSessions: number;
  calibrationComplete: boolean;
  averageKd: number;
  averageAccuracy: number;
  averageHeadshotPercent: number;
  currentSensitivity: string;
  currentAdsSensitivity: string;
  currentDeadzone: string;
}
