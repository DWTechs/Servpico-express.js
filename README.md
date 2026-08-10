
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/servpico-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Fservpico-express.svg)](https://www.npmjs.com/package/@dwtechs/servpico-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Servpico-express.js)](https://www.npmjs.com/package/@dwtechs/servpico-express)
![Jest:coverage](https://img.shields.io/badge/Jest:coverage-100%25-brightgreen.svg)


- [Synopsis](#synopsis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Logs](#logs)
- [Support](#support)
- [Contributors](#contributors)
- [Stack](#stack)


## Synopsis

**[Servpico-express.js](https://github.com/DWTechs/Servpico-express.js)** is an open source library to start and close Express.js service properly.

- ⚡ Built for speed
- 📦 Only 1 dependency to log service activity properly
- 🪶 Very lightweight
- 🧪 Thoroughly tested
- 🚚 Shipped as ES2022 ECMAScript module
- 📝 Written in Typescript


## Installation

```bash
$ npm i @dwtechs/servpico-express
```


## Configuration

Servpico-express reads the following environment variables:

| Variable               | Required | Default | Description                                                                                     |
| ---------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `PORT`                 | no       | `3000`  | Port to bind. Must be an integer in `[1, 65535]`; invalid values fall back to the default.       |
| `SHUTDOWN_TIMEOUT_MS`  | no       | `10000` | Force-exit deadline (ms) if `server.close()` doesn't complete — see [Shutdown behavior](#shutdown-behavior). |


## Usage

```javascript

import express from "express";
import { listen, failFast } from "@dwtechs/servpico-express";

// Usual express app initialization
const app = express();
// ...

app.get('/', (req, res) => res.send('Hello World!'));

// Init reference data — fail fast if any init step rejects.
Promise.all([
    // Your init asynchronous functions here
  ])
  .then(() => listen(app))
  .catch(failFast);

// or the simplest way if no asynchronous reference data is needed:
// listen(app);

```

Using `failFast` as the `.catch` handler ensures a rejected init promise
terminates the process with exit code 1 (so your container / process manager
restarts you) instead of leaving a zombie process alive with no HTTP port
bound. See the [API Reference](#api-reference) for the full rationale.

`listen()` automatically registers graceful shutdown handlers for **SIGTERM**, **SIGINT**, and **SIGHUP** signals, which will call `close()` on the server.

### Startup errors

Bind failures (`EADDRINUSE`, `EACCES`, `EADDRNOTAVAIL`, ...) surface
asynchronously via the underlying HTTP server's `error` event, not as a
synchronous throw. Since 0.3.1 `listen()` attaches a listener for that event
and routes failures through `failFast`, producing the same clean
`[servpico-express] App cannot start: ...` output as the pre-`listen()` init
path. Post-listen server-level errors (rare — FD exhaustion, kernel socket
issues) are logged as `Server error after listening: ...` and also trigger a
deferred `process.exit(1)`. In both cases the orchestrator can restart
cleanly rather than seeing an unprefixed Node stack trace or a zombie.

### Shutdown behavior

`close()` (invoked automatically on SIGTERM / SIGINT / SIGHUP) awaits
`server.close()`, which itself waits for all in-flight connections to finish.
Long-lived keep-alive, SSE, or WebSocket connections can hold that callback
open indefinitely — long enough that Kubernetes / Docker / systemd send
SIGKILL and terminate the process dirtily.

Since 0.3.1 `close()` starts a **force-exit timer** (default `10000` ms,
configurable via `SHUTDOWN_TIMEOUT_MS`). If `server.close()` hasn't completed
in time, the process logs a warning and exits `1` on its own — inside your
own grace window, with a clean log line explaining what happened. The timer
is `unref`'d so it doesn't itself keep the event loop alive.

The success-path exit is also deferred via `setImmediate` so the final
"Service closed" log line flushes to piped stdout / stderr before the
process exits.

### Test with docker

Get the container id with "docker ps" command and kill the container like this :

```bash
$ docker ps
$ docker kill --signal=SIGTERM <container_name_or_id>
```

## API Reference

```typescript

// Start the server on process.env.PORT (default: 3000).
// Automatically registers SIGTERM, SIGINT, and SIGHUP handlers for graceful shutdown.
// Since 0.3.1: attaches a server 'error' listener; bind failures
// (EADDRINUSE / EACCES / ...) route through failFast for a clean exit
// instead of an unprefixed Node stack trace.
function listen(app: Express): void;

// Gracefully close an HTTP server and exit the process with code 0.
// Called automatically by listen() on termination signals.
// Use this directly only if you manage the server lifecycle yourself.
// Since 0.3.1: starts a force-exit timer (SHUTDOWN_TIMEOUT_MS, default
// 10000ms) so long-lived connections can't zombie the shutdown, and the
// success exit is deferred via setImmediate for log-flush parity with
// failFast.
function close(server: Server): void;

// Terminal handler for unrecoverable boot-time errors. Intended as a
// `.catch` handler on the pre-listen() init pipeline:
//
//   Promise.all([svc1.init(), svc2.init()]).then(() => listen(app)).catch(failFast);
//
// Logs the error (message + stack) with the `[servpico-express]` prefix,
// then defers process.exit(1) by one tick via setImmediate so the log
// line can flush to stderr on piped destinations (Docker, systemd, PM2).
//
// Required (rather than a naked process.exit(1) in your own .catch)
// because: (1) init() rejections mean listen() was never called, so the
// SIGTERM/SIGINT/SIGHUP handlers registered inside listen() don't exist
// — open handles from imported modules (DB pools, timers) would keep the
// Node runtime alive as a zombie; (2) process.exitCode = 1 alone would
// not help because the event loop never drains; (3) synchronous exit
// without setImmediate would truncate the last log line on piped stderr.
//
// Accepts { message }, { msg }, string, and null/undefined error shapes.
function failFast(err: unknown): never;

```

## Logs

**Servpico-express.js** uses **[@dwtechs/Winstan](https://www.npmjs.com/package/@dwtechs/winstan)** library for logging.

## Support

| Environment | Version |
| :---------- | :-----: |
| Node.js     |  >= 22  |

## Contributors

**Servpico-express.js** is still in development and we would be glad to get all the help you can provide.
To contribute please read **[contributor.md](https://github.com/DWTechs/Servpico-express.js/blob/main/contributor.md)** for detailed installation guide.

## Stack

| Purpose         |                    Choice                    |                                                     Motivation |
| :-------------- | :------------------------------------------: | -------------------------------------------------------------: |
| repository      |        [Github](https://github.com/)         | hosting for software development version control using Git |
| package manager |     [npm](https://www.npmjs.com/get-npm)     | default node.js package manager |
| language        | [TypeScript](https://www.typescriptlang.org) | static type checking along with the latest ECMAScript features |
| module bundler  |      [Rollup](https://rollupjs.org)          | advanced module bundler for ES2022 modules |
| unit testing    |          [Jest](https://jestjs.io/)          | delightful testing with a focus on simplicity |
