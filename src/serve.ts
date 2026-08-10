import { log } from "@dwtechs/winstan";
import type { Express } from "express";
import type { Server } from "http";

const LOGS_PREFIX = "[servpico-express] ";
const DEFAULT_PORT = 3000;

function parsePort(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : DEFAULT_PORT;
}

/**
 * Starts the server and listens for incoming requests on the specified port.
 * 
 * This function binds the Express application to a port (from PORT environment variable or defaults to 3000)
 * and sets up graceful shutdown handlers for SIGTERM, SIGINT, and SIGHUP signals.
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
  const s = app.listen(port, () => log.info(() => `${LOGS_PREFIX}App listening on port ${port}`));
  // Graceful shutdown — use once() to avoid duplicate handlers and double-close
  process.once("SIGTERM", () => close(s));
  process.once("SIGINT", () => close(s));
  process.once("SIGHUP", () => close(s));
}

/**
 * Closes the server gracefully upon receiving a termination signal.
 * 
 * This function handles the graceful shutdown of an HTTP server by:
 * - Logging the shutdown initiation
 * - Closing the server and waiting for existing connections to finish
 * - Exiting the process with status code 0 on successful closure
 * - Logging and handling any errors that occur during shutdown
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
  try {
    server.close(() => {
      log.info(`${LOGS_PREFIX}Service closed`);
      process.exit(0);
    });
  } catch (err) {
    log.error(() => `${LOGS_PREFIX}Service cannot close properly: ${err}`);
    process.exit(1);
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
  const e = (err ?? {}) as { message?: string; msg?: string; stack?: string };
  const summary = e.message ?? e.msg ?? String(err);
  log.error(`${LOGS_PREFIX}App cannot start: ${summary}`);
  if (e.stack) log.error(() => `${LOGS_PREFIX}${e.stack}`);
  setImmediate(() => process.exit(1));
  return undefined as never;
}

export {
  listen,
  close,
  failFast,
};
