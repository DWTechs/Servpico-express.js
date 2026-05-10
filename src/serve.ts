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

export {
  listen,
  close,
};
