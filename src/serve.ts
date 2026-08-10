import { log } from "@dwtechs/winstan";
import type { Express } from "express";
import type { Server } from "http";

const LOGS_PREFIX = "[servpico-express] ";
const DEFAULT_PORT = 3000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

function parsePort(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : DEFAULT_PORT;
}

function parseShutdownTimeout(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SHUTDOWN_TIMEOUT_MS;
}

/**
 * Internal helper — logs an error with the `[servpico-express]` prefix, appends
 * an optional stack trace on a second line, then defers `process.exit(code)` by
 * one tick via `setImmediate` so the log lines can flush on piped stderr
 * (Docker, systemd-journald, PM2). Accepts `{ message }`, `{ msg }`, and
 * string / null / undefined error shapes so it composes with mixed sources.
 * Not exported — it is the shared exit ceremony behind `failFast`, `listen`'s
 * error path, and `close`'s failure paths.
 */
function logAndExit(prefix: string, err: unknown, code = 1): never {
  const e = (err ?? {}) as { message?: string; msg?: string; stack?: string };
  const summary = e.message ?? e.msg ?? String(err);
  log.error(`${LOGS_PREFIX}${prefix}: ${summary}`);
  if (e.stack) log.error(() => `${LOGS_PREFIX}${e.stack}`);
  setImmediate(() => process.exit(code));
  return undefined as never;
}

/**
 * Starts the server and listens for incoming requests on the specified port.
 * 
 * This function binds the Express application to a port (from PORT environment variable or defaults to 3000)
 * and sets up graceful shutdown handlers for SIGTERM, SIGINT, and SIGHUP signals.
 * 
 * Bind failures (`EADDRINUSE`, `EACCES`, `EADDRNOTAVAIL`, ...) surface via the
 * underlying `http.Server`'s asynchronous `error` event rather than a
 * synchronous throw. A listener is attached that routes those to `failFast`,
 * producing the same clean `[servpico-express] App cannot start: ...` log +
 * deferred `process.exit(1)` that the pre-`listen()` init-promise path uses.
 * Post-listen server-level errors (rare — FD exhaustion, OS socket issues)
 * are logged as `Server error after listening: ...` and also trigger a
 * deferred `process.exit(1)` so an orchestrator can restart cleanly.
 *
 * @param {Express} app - The Express application instance to start listening
 * @returns {void} This function does not return a value
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { listen } from '@dwtechs/servpico-express';
 * 
 * const app = express();
 * app.get('/', (req, res) => res.send('Hello World!'));
 * listen(app);
 * ```
 */
function listen(app: Express): void {
  const port = parsePort(process.env.PORT);
  let listening = false;
  const server = app.listen(port, () => {
    listening = true;
    log.info(() => `${LOGS_PREFIX}App listening on port ${port}`);
  });
  server.on("error", (err: unknown) =>
    listening
      ? logAndExit("Server error after listening", err)
      : failFast(err),
  );
  process.once("SIGTERM", () => close(server));
  process.once("SIGINT", () => close(server));
  process.once("SIGHUP", () => close(server));
}

/**
 * Closes the server gracefully upon receiving a termination signal.
 *
 * Behavior:
 * - Logs the shutdown initiation.
 * - Starts a **force-exit timer** (default 10000 ms, configurable via
 *   `SHUTDOWN_TIMEOUT_MS`). If `server.close()` has not completed within
 *   this window, the process exits 1 with an explanatory log line. This
 *   prevents zombie shutdowns caused by long-lived keep-alive / SSE /
 *   WebSocket connections that block `server.close()`'s callback
 *   indefinitely and force the orchestrator into a SIGKILL.
 * - Awaits `server.close()`. When the callback fires:
 *   - No `err` argument → logs `Service closed`, defers `process.exit(0)`
 *     via `setImmediate` (same stderr-flush reasoning as `failFast`).
 *   - Callback `err` present (e.g. `ERR_SERVER_NOT_RUNNING`) → routed
 *     through `logAndExit("Service close reported error", err)` for a
 *     clean exit 1 with the error surfaced.
 * - Synchronous throw from `server.close()` (rare; defensive) → same
 *   `logAndExit` path with the exception as the error.
 *
 * The `SHUTDOWN_TIMEOUT_MS` env var defaults to 10000 (10s). Chosen to sit
 * comfortably inside Kubernetes' 30s `terminationGracePeriodSeconds` default
 * and match Docker Compose's 10s stop grace, while covering HTTP keep-alive's
 * ~5s idle timeout with headroom for in-flight drains.
 *
 * @param {Server} server - The HTTP server instance to be closed (typically returned from app.listen())
 * @returns {void} This function does not return a value
 *
 * @example
 * ```typescript
 * import express from 'express';
 * 
 * const app = express();
 * const server = app.listen(3000);
 * 
 * // Gracefully close the server
 * close(server);
 * ```
 *
 * @throws {Error} Logs error if server cannot close properly
 */
function close(server: Server): void {
  log.info(`${LOGS_PREFIX}Shutdown signal received: closing service`);
  const timeoutMs = parseShutdownTimeout(process.env.SHUTDOWN_TIMEOUT_MS);
  const forceTimer = setTimeout(() => {
    log.error(
      `${LOGS_PREFIX}Service did not close within ${timeoutMs}ms — forcing exit`,
    );
    setImmediate(() => process.exit(1));
  }, timeoutMs);
  // Prevent the timer itself from keeping the event loop alive if close()
  // completes cleanly and clears it — this is what lets the process exit
  // through the setImmediate paths rather than lingering on the timer handle.
  forceTimer.unref();
  try {
    server.close((err) => {
      clearTimeout(forceTimer);
      if (err) return logAndExit("Service close reported error", err);
      log.info(`${LOGS_PREFIX}Service closed`);
      setImmediate(() => process.exit(0));
    });
  } catch (err) {
    clearTimeout(forceTimer);
    logAndExit("Service cannot close properly", err);
  }
}

/**
 * Terminal handler for unrecoverable boot-time errors. Logs the error and
 * exits the process with code 1. Intended as a `.catch` handler on the
 * pre-`listen()` initialization pipeline:
 *
 * @example
 * ```typescript
 * import { listen, failFast } from '@dwtechs/servpico-express';
 *
 * Promise.all([
 *   consumerSvc.init(),
 *   routeSvc.init(),
 *   // ...
 * ])
 *   .then(() => listen(app))
 *   .catch(failFast);
 * ```
 *
 * Why an explicit `process.exit(1)` (rather than `process.exitCode = 1`):
 * an init() rejection means `listen()` was never called, so the SIGTERM /
 * SIGINT / SIGHUP handlers registered inside `listen()` do not exist. Open
 * handles from imported modules (DB pools, timers, cron schedulers) will
 * keep the Node runtime alive indefinitely — the process becomes a zombie
 * that logs "cannot start" then never exits. Explicit exit is required.
 *
 * Why `setImmediate` before the exit: the log line goes through winstan →
 * `console.error` → `process.stderr`, and stderr is **asynchronous** when
 * piped to a file or socket (Docker, systemd-journald, PM2 all pipe). A
 * synchronous `process.exit(1)` on the same tick would truncate the log
 * line in exactly the environments where it is most needed. One deferred
 * tick lets the queued write flush.
 *
 * Accepts both `{ message }` and `{ msg }` error shapes so it composes
 * with libraries that throw either (e.g. `@dwtechs/antity-pgsql`'s Select
 * throws `{ status, message }` while other paths throw `Error`) without
 * forcing every caller to normalize.
 *
 * @param {unknown} err - The error that caused the boot failure.
 * @returns {never} Never returns — the process exits on the next tick.
 *
 * @example
 * ```typescript
 * // Also usable directly when a synchronous init step fails:
 * try {
 *   loadConfig();
 * } catch (err) {
 *   failFast(err);
 * }
 * ```
 */
function failFast(err: unknown): never {
  return logAndExit("App cannot start", err);
}

export {
  listen,
  close,
  failFast,
};
