const allowedExternalProtocols = new Set(["https:", "http:"]);
const allowedDevHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const blockedOwnWindowPattern = /aimtune|electron/i;

export interface CaptureSource {
  id: string;
  name: string;
}

export interface DisplayMediaPolicyRequest {
  securityOrigin: string;
  videoRequested: boolean;
  audioRequested: boolean;
  userGesture: boolean;
  selectedSourceId?: string;
}

export function isAllowedExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return allowedExternalProtocols.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function isAllowedDevServerUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" &&
      allowedDevHosts.has(parsed.hostname) &&
      parsed.port === "5173"
    );
  } catch {
    return false;
  }
}

export function isTrustedAppNavigation(url: string, isDev: boolean) {
  if (isDev) return isAllowedDevServerUrl(url);

  try {
    return new URL(url).protocol === "file:";
  } catch {
    return false;
  }
}

export function isTrustedCaptureOrigin(origin: string, isDev: boolean) {
  return isTrustedAppNavigation(origin, isDev);
}

export function isWindowSourceId(id?: string) {
  return Boolean(id?.startsWith("window:"));
}

export function isCapturableWindowSource(source: CaptureSource) {
  return (
    isWindowSourceId(source.id) &&
    source.name.trim().length > 0 &&
    !blockedOwnWindowPattern.test(source.name)
  );
}

export function validateDisplayMediaRequest(
  request: DisplayMediaPolicyRequest,
  isDev: boolean
) {
  if (!request.userGesture) {
    return { allowed: false, reason: "missing_user_gesture" };
  }
  if (!isTrustedCaptureOrigin(request.securityOrigin, isDev)) {
    return { allowed: false, reason: "untrusted_origin" };
  }
  if (!request.videoRequested) {
    return { allowed: false, reason: "video_not_requested" };
  }
  if (request.audioRequested) {
    return { allowed: false, reason: "audio_denied" };
  }
  if (!request.selectedSourceId) {
    return { allowed: false, reason: "source_not_selected" };
  }
  if (!isWindowSourceId(request.selectedSourceId)) {
    return { allowed: false, reason: "display_capture_denied" };
  }

  return { allowed: true, reason: "allowed" };
}
