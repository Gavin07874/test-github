const allowedExternalProtocols = new Set(["https:", "http:"]);
const allowedDevHosts = new Set(["127.0.0.1", "localhost", "::1"]);

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
