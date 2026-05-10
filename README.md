
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/servpico-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Fservpico-express.svg)](https://www.npmjs.com/package/@dwtechs/servpico-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Servpico-express.js)](https://www.npmjs.com/package/@dwtechs/servpico-express)
![Jest:coverage](https://img.shields.io/badge/Jest:coverage-100%25-brightgreen.svg)


- [Synopsis](#synopsis)
- [Installation](#installation)
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


## Usage

```javascript

import express from "express";
import { listen } from "@dwtechs/servpico-express";

// Usual express app initialization
const app = express();
// ...

app.get('/', (req, res) => res.send('Hello World!'));

// Init reference data
Promise.all([
    // Your init asynchronous functions here
  ])
  .then(() => listen(app))
  .catch((err) => console.error(`App cannot start: ${err.message}`));

// or the simplest way if no asynchronous reference data is needed:
// listen(app);

```

The library will look for an environment variable named **PORT** to start the service on.
It must be a valid integer between **1** and **65535**. If not set or invalid, it defaults to **3000**.

`listen()` automatically registers graceful shutdown handlers for **SIGTERM**, **SIGINT**, and **SIGHUP** signals, which will call `close()` on the server.

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
function listen(app: Express): void;

// Gracefully close an HTTP server and exit the process with code 0.
// Called automatically by listen() on termination signals.
// Use this directly only if you manage the server lifecycle yourself.
function close(server: Server): void;

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
| repository      |        [Github](https://github.com/)         |     hosting for software development version control using Git |
| package manager |     [npm](https://www.npmjs.com/get-npm)     |                                default node.js package manager |
| language        | [TypeScript](https://www.typescriptlang.org) | static type checking along with the latest ECMAScript features |
| module bundler  |      [Rollup](https://rollupjs.org)          |                        advanced module bundler for ES6 modules |
| unit testing    |          [Jest](https://jestjs.io/)          |                  delightful testing with a focus on simplicity |
