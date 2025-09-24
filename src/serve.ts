import { log } from "@dwtechs/winstan";
import type { Express } from "express";
import type { Server } from "http";

const LOGS_PREFIX = "[servpico-express] ";
const { PORT = "3000" } = process.env;

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
  const s = app.listen(PORT, () => log.info(`${LOGS_PREFIX}App listening on port ${PORT}`));
  // Graceful shutdown
  process.on("SIGTERM", () => close(s));
  process.on("SIGINT", () => close(s));
  process.on("SIGHUP", () => close(s));
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
  log.info(`${LOGS_PREFIX}SIGTERM signal received: closing service`);
  try {
    server.close(() => {
      log.info(`${LOGS_PREFIX}Service closed`);
      process.exit(0);
    });
  } catch (err) {
    log.error(`${LOGS_PREFIX}Service cannot close properly: ${err}`);
  }
}

export {
  listen,
  close,
};
