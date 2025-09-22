
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/passken-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Fpassken-express.svg)](https://www.npmjs.com/package/@dwtechs/passken-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Passken-express.js)](https://www.npmjs.com/package/@dwtechs/passken-express)


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

This is the oldest targeted versions.  


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

// Init reference data
Promise.all([
    // Your init asynchronous functions here
  ])
  .then(() => listen(app))
  .catch((err) => log.error(`App cannot start: ${err.msg}`));


```

Le library will look for an environment variable named **PORT** to start the service on.
If not found it will default to **3000**.


## API Reference

```javascript

function listen(app: Express): Promise<http.Server>

```


## Logs

**Servpico-express.js** uses **[@dwtechs/Winstan](https://www.npmjs.com/package/@dwtechs/winstan)** library for logging.
All logs are in debug mode. Meaning they should not appear in production mode.


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
