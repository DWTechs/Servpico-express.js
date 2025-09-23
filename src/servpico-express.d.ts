import type { Express } from "express";
import type { Server } from "http";
declare function listen(app: Express): void;
declare function close(server: Server): void;
export { listen, close };
