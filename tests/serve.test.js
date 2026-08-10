const { listen, close, failFast } = require("../dist/servpico-express.js");
const { log } = require("@dwtechs/winstan");

describe("close", () => {
    let originalExit;
    beforeAll(() => {
        originalExit = process.exit;
        process.exit = jest.fn();
    });
    afterAll(() => {
        process.exit = originalExit;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should log info messages on server close", () => {
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const closeCallback = jest.fn();
        const server = {
            close: (cb) => {
                cb();
            }
        };
        close(server);
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Shutdown signal received"));
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Service closed"));
        expect(log.error).not.toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(0);
    });
    it("should log error if server.close throws", () => {
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = {
            close: () => {
                throw new Error("fail");
            }
        };
        close(server);
        expect(log.error).toHaveBeenCalledWith(expect.any(Function));
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});

describe("listen", () => {
    let originalProcessOnce;
    let originalClose;
    let mockLogInfo;
    beforeAll(() => {
        originalProcessOnce = process.once;
        process.once = jest.fn();
    });
    afterAll(() => {
        process.once = originalProcessOnce;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogInfo = jest.spyOn(log, "info").mockImplementation(jest.fn());
        originalClose = jest.fn();
    });
    it("should log and register signal handlers on listen", () => {
        const app = {
            listen: jest.fn((port, cb) => {
                cb && cb();
                return { close: originalClose };
            })
        };
        listen(app);
        expect(app.listen).toHaveBeenCalled();
        expect(mockLogInfo).toHaveBeenCalledWith(expect.any(Function));
        expect(process.once).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
        expect(process.once).toHaveBeenCalledWith("SIGINT", expect.any(Function));
        expect(process.once).toHaveBeenCalledWith("SIGHUP", expect.any(Function));
    });
    it("should use a valid numeric PORT from env", () => {
        process.env.PORT = "8080";
        const app = {
            listen: jest.fn((port, cb) => {
                cb && cb();
                return { close: originalClose };
            })
        };
        listen(app);
        expect(app.listen).toHaveBeenCalledWith(8080, expect.any(Function));
        delete process.env.PORT;
    });
    it("should fall back to port 3000 for an invalid PORT env value", () => {
        process.env.PORT = "not-a-port";
        const app = {
            listen: jest.fn((port, cb) => {
                cb && cb();
                return { close: originalClose };
            })
        };
        listen(app);
        expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
        delete process.env.PORT;
    });
    it("should fall back to port 3000 for an out-of-range PORT env value", () => {
        process.env.PORT = "99999";
        const app = {
            listen: jest.fn((port, cb) => {
                cb && cb();
                return { close: originalClose };
            })
        };
        listen(app);
        expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
        delete process.env.PORT;
    });
    it("should fall back to port 3000 when PORT env is 0", () => {
        process.env.PORT = "0";
        const app = {
            listen: jest.fn((port, cb) => {
                cb && cb();
                return { close: originalClose };
            })
        };
        listen(app);
        expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
        delete process.env.PORT;
    });
});

describe("failFast", () => {
    let originalExit;
    let originalSetImmediate;
    let mockExit;
    let mockLogError;

    beforeAll(() => {
        originalExit = process.exit;
        originalSetImmediate = global.setImmediate;
        mockExit = jest.fn();
        process.exit = mockExit;
    });
    afterAll(() => {
        process.exit = originalExit;
        global.setImmediate = originalSetImmediate;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogError = jest.spyOn(log, "error").mockImplementation(jest.fn());
        // Capture the scheduled callback synchronously so each test can assert
        // that (a) setImmediate was called and (b) the callback exits with 1.
        // We intentionally do NOT invoke it eagerly — the whole point of the
        // helper is to defer the exit by one tick, and the tests verify that.
        global.setImmediate = jest.fn();
    });

    it("logs 'App cannot start: <message>' for a standard Error", () => {
        failFast(new Error("db unreachable"));

        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("App cannot start: db unreachable")
        );
    });

    it("reads err.message when present", () => {
        failFast({ message: "constraint missing" });

        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("App cannot start: constraint missing")
        );
    });

    it("falls back to err.msg when err.message is absent (antity-pgsql legacy shape)", () => {
        failFast({ msg: "legacy shape error" });

        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("App cannot start: legacy shape error")
        );
    });

    it("falls back to String(err) when neither message nor msg is present", () => {
        failFast("string error thrown as-is");

        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("App cannot start: string error thrown as-is")
        );
    });

    it("prefers err.message over err.msg when both are present", () => {
        failFast({ message: "the real one", msg: "the legacy one" });

        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("App cannot start: the real one")
        );
        expect(mockLogError).not.toHaveBeenCalledWith(
            expect.stringContaining("the legacy one")
        );
    });

    it("does not throw on null / undefined errors — logs 'null' / 'undefined' rather than crashing", () => {
        expect(() => failFast(null)).not.toThrow();
        expect(() => failFast(undefined)).not.toThrow();
        // The two calls above should have produced two log lines, one for each.
        expect(mockLogError).toHaveBeenCalledTimes(2);
    });

    it("logs the stack trace on a second line when present", () => {
        const err = new Error("boom");
        // node's Error.stack is a string; the exact format is version-dependent
        // so we just assert the presence of a second log call that carries it.
        failFast(err);

        expect(mockLogError).toHaveBeenCalledTimes(2);
        // Second call receives a lazy function per the log.error(() => ...) idiom
        // that winstan supports. Invoking it should yield a string containing
        // the stack.
        const secondCallArg = mockLogError.mock.calls[1][0];
        const rendered = typeof secondCallArg === "function" ? secondCallArg() : secondCallArg;
        expect(rendered).toEqual(expect.stringContaining("boom"));
    });

    it("does not log a second line when the error has no stack", () => {
        failFast({ message: "plain object, no stack" });

        expect(mockLogError).toHaveBeenCalledTimes(1);
    });

    it("prefixes both log lines with '[servpico-express] ' for greppability", () => {
        failFast(new Error("prefixed"));

        // First call: the "cannot start" summary.
        expect(mockLogError.mock.calls[0][0]).toEqual(
            expect.stringContaining("[servpico-express] ")
        );
        // Second call: the stack line (also prefixed).
        const stackArg = mockLogError.mock.calls[1][0];
        const stackRendered = typeof stackArg === "function" ? stackArg() : stackArg;
        expect(stackRendered).toEqual(
            expect.stringContaining("[servpico-express] ")
        );
    });

    it("defers process.exit(1) via setImmediate so log writes can flush", () => {
        failFast(new Error("boom"));

        // The exit MUST NOT have happened yet on this tick — that's the whole
        // point of the helper. If a naked process.exit(1) shipped, stderr
        // would be truncated on piped destinations (Docker, systemd, PM2).
        expect(mockExit).not.toHaveBeenCalled();
        expect(global.setImmediate).toHaveBeenCalledTimes(1);

        // The scheduled callback, when invoked by the event loop, must exit 1.
        const scheduled = global.setImmediate.mock.calls[0][0];
        scheduled();
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("returns undefined (typed as `never`) — callers can treat the call site as terminal", () => {
        const result = failFast(new Error("terminal"));

        expect(result).toBeUndefined();
    });
});
