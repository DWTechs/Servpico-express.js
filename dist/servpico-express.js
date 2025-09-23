/*
MIT License

Copyright (c) 2022 DWTechs

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

https://github.com/DWTechs/Servpico-express.js
*/

import { log } from '@dwtechs/winstan';

const LOGS_PREFIX = "[servpico-express] ";
const { PORT = "3000" } = process.env;
function listen(app) {
    const s = app.listen(PORT, () => log.info(`${LOGS_PREFIX}App listening on port ${PORT}`));
    process.on("SIGTERM", () => close(s));
    process.on("SIGINT", () => close(s));
}
function close(server) {
    log.info(`${LOGS_PREFIX}SIGTERM signal received: closing service`);
    try {
        server.close(() => {
            log.info(`${LOGS_PREFIX}Service closed`);
            process.exit(0);
        });
    }
    catch (err) {
        log.error(`${LOGS_PREFIX}Service cannot close properly: ${err}`);
    }
}

export { listen };
