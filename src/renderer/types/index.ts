export type AppMode = "pc" | "console_remote_play";
export type GameId = "fortnite" | "tlou2";
export type Platform = "pc" | "playstation";
export type AppStep =
  | "home"
  | "setup"
  | "controller"
  | "settings"
  | "calibration"
  | "capture"
  | "report"
  | "dashboard";

export interface SettingDefinition {
  key: keyof SettingsMirror;
  label: string;
  min: number;
  max: number;
  step: number;
  section: string;
  hint: string;
}

export interface GameProfile {
  id: GameId;
  name: string;
  shortName: string;
  platform: Platform;
  settingPath: string;
  theme: "fortnite" | "tlou2";
  description: string;
  settings: SettingDefinition[];
  responseCurves: string[];
  defaults: SettingsMirror;
}

export interface SettingsMirror {
  lookX: number;
  lookY: number;
  aimX: number;
  aimY: number;
  scopedX: number;
  scopedY: number;
  leftDeadzone: number;
  rightDeadzone: number;
  acceleration: number;
  rampPower: number;
  responseCurve: string;
  weaponSwapInvert: boolean;
}

export interface AppSetup {
  mode: AppMode;
  gameId: GameId;
}

export interface ControllerButtonState {
  index: number;
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface ControllerSample {
  id: string;
  sessionId: string;
  timestamp: number;
  connected: boolean;
  controllerId?: string;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  leftTrigger: number;
  rightTrigger: number;
  buttons: number[];
}

export type CalibrationMode = "quick" | "full";
export type CalibrationTestId =
  | "drift"
  | "micro"
  | "flick"
  | "tracking"
  | "turn"
  | "ads";

export interface CalibrationTest {
  id: CalibrationTestId;
  name: string;
  purpose: string;
  instructions: string;
  durationSeconds: number;
  metrics: string[];
}

export interface CalibrationMetric {
  id: string;
  runId: string;
  gameId: GameId;
  mode: CalibrationMode;
  createdAt: string;
  sampleCount: number;
  driftAverage: number;
  driftMax: number;
  microOvershootRate: number;
  microUndershootRate: number;
  microJitter: number;
  microAccuracy: number;
  flickOvershootRate: number;
  flickUndershootRate: number;
  flickSettleMs: number;
  trackingError: number;
  trackingSmoothness: number;
  turnConsistency: number;
  maxTurnInputPercent: number;
  adsJitter: number;
  firingStability: number;
}

export interface CalibrationRun {
  id: string;
  gameId: GameId;
  mode: CalibrationMode;
  startedAt: string;
  endedAt?: string;
  status: "running" | "complete" | "cancelled";
}

export interface CapturableWindowSource {
  id: string;
  name: string;
}

export interface CaptureSession {
  id: string;
  gameId: GameId;
  mode: AppMode;
  sourceName: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  status: "running" | "paused" | "stopped" | "partial" | "error";
  modelStatus: "ready" | "fallback" | "unavailable";
}

export interface VisionDetection {
  id: string;
  captureSessionId: string;
  timestamp: number;
  label: string;
  score: number;
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
  candidateTarget: boolean;
}

export interface VisionFrameMetric {
  id: string;
  captureSessionId: string;
  timestamp: number;
  brightness: number;
  sceneChangeScore: number;
  fullMotionScore: number;
  centerMotionScore: number;
  reticleStabilityScore: number;
  targetProximityScore: number;
  targetMotionScore: number;
  controllerStickMagnitude: number;
  adsActive: boolean;
  fireActive: boolean;
  candidateTargetCount: number;
  modelAvailable: boolean;
}

export interface AnalysisSummary {
  id: string;
  captureSessionId: string;
  sampleCount: number;
  detectionCount: number;
  averageStability: number;
  averageCenterMotion: number;
  averageTargetProximity: number;
  controllerScreenCorrelation: number;
  adsInstability: number;
  firingInstability: number;
  targetSignalConfidence: number;
  modelStatus: "ready" | "fallback" | "unavailable";
  confidenceContribution: number;
}

export interface Recommendation {
  id: string;
  gameId: GameId;
  settingKey: keyof SettingsMirror;
  settingLabel: string;
  currentValue: number | string | boolean;
  recommendedValue: number | string | boolean;
  exactDelta: number | string;
  severity: "mild" | "medium" | "severe" | "extreme";
  confidence: number;
  reason: string;
  supportingMetrics: Record<string, number | string>;
  sources: Array<"calibration" | "controller" | "capture" | "vision" | "post_game">;
}

export interface PostGameStats {
  id: string;
  gameId: GameId;
  createdAt: string;
  kills?: number;
  deaths?: number;
  accuracyPercent?: number;
  headshotPercent?: number;
  notes: string;
}

export interface LocalExportSnapshot {
  exportedAt: string;
  setup?: AppSetup;
  settings?: SettingsMirror;
  calibrationMetrics: CalibrationMetric[];
  captureSessions: CaptureSession[];
  visionFrameMetrics: VisionFrameMetric[];
  visionDetections: VisionDetection[];
  analysisSummaries: AnalysisSummary[];
  recommendations: Recommendation[];
  postGameStats: PostGameStats[];
  safetyBoundary: string;
}
