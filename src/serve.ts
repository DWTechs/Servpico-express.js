import { log } from "@dwtechs/winstan";

const { PORT } = process.env;

/**
 * Starts the server and listens for incoming requests.
 *
 * @param {Express} app - The Express application instance.
 */
function listen(app) {
  const s = app.listen(PORT, () => log.info(`App listening on port ${PORT}`));
  // Graceful shutdown
  process.on("SIGTERM", () => close(s));
  process.on("SIGINT", () => close(s));
}

/**
 * Closes the server gracefully upon receiving a SIGTERM signal.
 *
 * @param {Server} server - The server to be closed.
 */
function close(server) {
  log.info("SIGTERM signal received: closing service");
  try {
    server.close(() => {
      log.info("Service closed");
      process.exit(0);
    });
  } catch (err) {
    log.error(`Service cannot close properly: ${err}`);
  }
}

export default {
  listen,
};
