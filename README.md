
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/servpico-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Fservpico-express.svg)](https://www.npmjs.com/package/@dwtechs/servpico-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Servpico-express.js)](https://www.npmjs.com/package/@dwtechs/servpico-express)
![Jest:coverage](https://img.shields.io/badge/Jest:coverage-81%25-brightgreen.svg)


- [Synopsis](#synopsis)
- [Support](#support)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Logs](#logs)
- [Contributors](#contributors)
- [Stack](#stack)


## Synopsis

**[Servpico-express.js](https://github.com/DWTechs/Servpico-express.js)** is an open source library to start and close Express.js service properly.

- ⚡ Built for speed
- 📦 Only 1 dependency to log service activity properly
- 🪶 Very lightweight
- 🧪 Thoroughly tested
- 🚚 Shipped as EcmaScrypt Express module
- 📝 Written in Typescript


## Support

- node: 22

This is the oldest targeted version.  


## Installation

```bash
$ npm i @dwtechs/servpico-express
```


## Usage

```javascript

import express from "express";
import { log } from "@dwtechs/winstan";
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
  .catch((err) => log.error(`App cannot start: ${err.msg}`));

// or the simplest way if no asynchronous reference data is needed : 
// listen(app);

```

The library will look for an environment variable named **PORT** to start the service on.
If not found it will default to **3000**.

### Test with docker

Get the container id with "docker ps" command and kill the container like this :

```bash
$ docker ps
$ docker kill --signal=SIGTERM <container_name_or_id>
```


## API Reference

```javascript

function listen(app: Express): void;
function close(server: Server): void;

```


## Logs

**Servpico-express.js** uses **[@dwtechs/Winstan](https://www.npmjs.com/package/@dwtechs/winstan)** library for logging.


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
