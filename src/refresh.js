const DEFAULT_REFRESH_INTERVAL = 30 * 60 * 1000;

export function setupAutoRefresh(win = window, intervalMs = DEFAULT_REFRESH_INTERVAL, scheduler = setInterval) {
  if (!win || !win.location || typeof win.location.reload !== "function") {
    throw new Error("setupAutoRefresh requires a window with a location.reload function");
  }
  if (typeof scheduler !== "function") {
    throw new Error("setupAutoRefresh requires a scheduler function, typically setInterval");
  }

  return scheduler(() => {
    win.location.reload();
  }, intervalMs);
}
