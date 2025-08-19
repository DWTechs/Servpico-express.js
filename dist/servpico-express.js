/*
MIT License

Copyright (c) 2025 DWTechs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/DWTechs/Passken-express.js
*/

import { isArray, isProperty, isString } from '@dwtechs/checkard';
import { randomPwd } from '@dwtechs/passken';
import { compare as compare$1, encrypt } from '@dwtechs/hashitaka';
import { log } from '@dwtechs/winstan';

const { PWD_SECRET } = process.env;
const PE_PREFIX = "Passken-express: ";
if (!PWD_SECRET)
    throw new Error(`${PE_PREFIX}Missing PWD_SECRET environment variable`);
let Opts = undefined;
function init(options) {
    Opts = options;
}
function compare(req, res, next) {
    var _a, _b, _c, _d;
    log.debug(`${PE_PREFIX}compare password hashes`);
    const pwd = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.password) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.pwd) || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.pwdHash);
    if (!pwd)
        return next({ statusCode: 400, message: `${PE_PREFIX}Missing password in the request. Should be in req.body.password or req.body.pwd` });
    let dbHash = undefined;
    if (isArray(res.rows, ">", 0)) {
        const r = res.rows[0];
        if (isProperty(r, "password", true, true) && isString(r.password, "!0"))
            dbHash = r.password;
        else if (isProperty(r, "pwd", true, true) && isString(r.pwd, "!0"))
            dbHash = r.pwd;
        else if (isProperty(r, "pwdHash", true, true) && isString(r.pwdHash, "!0"))
            dbHash = r.pwdHash;
    }
    else
        dbHash = res.password || res.pwd || res.pwdHash;
    if (isArray((_d = res.locals) === null || _d === void 0 ? void 0 : _d.rows, ">", 0)) {
        const r = res.locals.rows[0];
        if (isProperty(r, "password", true, true) && isString(r.password, "!0"))
            dbHash = r.password;
        else if (isProperty(r, "pwd", true, true) && isString(r.pwd, "!0"))
            dbHash = r.pwd;
        else if (isProperty(r, "pwdHash", true, true) && isString(r.pwdHash, "!0"))
            dbHash = r.pwdHash;
    }
    else
        dbHash = res.password || res.pwd || res.pwdHash;
    if (!dbHash)
        return next({ statusCode: 400, message: `${PE_PREFIX}Missing hash from the database. Should be in res.password or res.pwd or res.pwdHash or res.rows[0].password or res.rows[0].pwd or res.rows[0].pwdHash or res.locals.rows[0].password or res.locals.rows[0].pwd or res.locals.rows[0].pwdHash` });
    if (!compare$1(pwd, dbHash, PWD_SECRET))
        return next({ statusCode: 401, message: `${PE_PREFIX}Wrong password` });
    log.debug(`${PE_PREFIX}Correct password`);
    next();
}
function create(req, _res, next) {
    var _a;
    log.debug(`${PE_PREFIX}Create password`);
    if (!isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.rows, ">", 0))
        return next({ statusCode: 400, message: `${PE_PREFIX}Missing resources. Should be in req.body.rows` });
    for (const r of req.body.rows) {
        r.pwd = randomPwd(Opts);
        r.encryptedPwd = encrypt(r.pwd, PWD_SECRET);
    }
    next();
}

export { compare, create, init };
