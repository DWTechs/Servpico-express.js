const { listen, close, failFast } = require("../dist/servpico-express.js");
const { log } = require("@dwtechs/winstan");

describe("close", () => {
    let originalExit;
    let originalSetImmediate;
    let originalSetTimeout;
    let originalClearTimeout;
    let mockUnref;
    beforeAll(() => {
        originalExit = process.exit;
        originalSetImmediate = global.setImmediate;
        originalSetTimeout = global.setTimeout;
        originalClearTimeout = global.clearTimeout;
        process.exit = jest.fn();
    });
    afterAll(() => {
        process.exit = originalExit;
        global.setImmediate = originalSetImmediate;
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        // Capture setImmediate so success-path exit(0) is testable without a real
        // event-loop tick; existing failFast tests use the same pattern.
        global.setImmediate = jest.fn();
        // Stub setTimeout/clearTimeout so the force-exit timer can be inspected
        // without actual timer wall-clock time. .unref() is captured to assert
        // that the timer does not itself keep the loop alive.
        mockUnref = jest.fn();
        global.setTimeout = jest.fn(() => ({ unref: mockUnref }));
        global.clearTimeout = jest.fn();
        delete process.env.SHUTDOWN_TIMEOUT_MS;
    });
    it("should log info messages on server close", () => {
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = {
            close: (cb) => {
                cb();
            }
        };
        close(server);
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Shutdown signal received"));
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("Service closed"));
        expect(log.error).not.toHaveBeenCalled();
        // exit(0) is now deferred via setImmediate for stderr/stdout flush parity
        // with failFast. Assert both the deferral and the eventual exit code.
        expect(process.exit).not.toHaveBeenCalled();
        expect(global.setImmediate).toHaveBeenCalled();
        const scheduled = global.setImmediate.mock.calls.find(
            (c) => typeof c[0] === "function"
        )[0];
        scheduled();
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
        // "Service cannot close properly: fail" routed via logAndExit.
        expect(log.error).toHaveBeenCalledWith(
            expect.stringContaining("Service cannot close properly: fail")
        );
        // Exit is deferred through setImmediate now (via logAndExit), not naked.
        expect(process.exit).not.toHaveBeenCalled();
        const scheduled = global.setImmediate.mock.calls.find(
            (c) => typeof c[0] === "function"
        )[0];
        scheduled();
        expect(process.exit).toHaveBeenCalledWith(1);
    });
    it("routes close callback err argument through logAndExit", () => {
        // Node passes ERR_SERVER_NOT_RUNNING (or similar) when the server was
        // already closed. Previously ignored; now logged distinctly and exits 1.
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        const mockLogError = jest.spyOn(log, "error").mockImplementation(jest.fn());
        const err = Object.assign(new Error("Server was not running"), {
            code: "ERR_SERVER_NOT_RUNNING",
        });
        const server = { close: (cb) => cb(err) };
        close(server);
        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("Service close reported error: Server was not running")
        );
        expect(process.exit).not.toHaveBeenCalled();
        const scheduled = global.setImmediate.mock.calls.find(
            (c) => typeof c[0] === "function"
        )[0];
        scheduled();
        expect(process.exit).toHaveBeenCalledWith(1);
    });
    it("starts a force-exit timer that fires when server.close never completes", () => {
        // Simulates the zombie-shutdown case: long-lived keep-alive / SSE / WS
        // connections hold sockets open, server.close()'s callback never fires,
        // and we'd normally be SIGKILLed by the orchestrator. The timer forces
        // a clean exit(1) inside our own grace window instead.
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        const mockLogError = jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: jest.fn() }; // never invokes cb
        close(server);
        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
        expect(mockUnref).toHaveBeenCalledTimes(1);
        // Fire the force-exit timer manually.
        const timerCallback = global.setTimeout.mock.calls[0][0];
        timerCallback();
        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("Service did not close within 10000ms")
        );
        const scheduled = global.setImmediate.mock.calls.find(
            (c) => typeof c[0] === "function"
        )[0];
        scheduled();
        expect(process.exit).toHaveBeenCalledWith(1);
    });
    it("clears the force-exit timer when server.close completes cleanly", () => {
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: (cb) => cb() };
        close(server);
        expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });
    it("clears the force-exit timer when close callback receives an err", () => {
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: (cb) => cb(new Error("already closed")) };
        close(server);
        expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });
    it("clears the force-exit timer when server.close throws synchronously", () => {
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = {
            close: () => {
                throw new Error("sync boom");
            }
        };
        close(server);
        expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });
    it("respects SHUTDOWN_TIMEOUT_MS env var when set to a valid positive number", () => {
        process.env.SHUTDOWN_TIMEOUT_MS = "5000";
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: jest.fn() };
        close(server);
        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
    it("falls back to 10000ms for an invalid SHUTDOWN_TIMEOUT_MS value", () => {
        process.env.SHUTDOWN_TIMEOUT_MS = "not-a-number";
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: jest.fn() };
        close(server);
        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
    });
    it("falls back to 10000ms for a negative SHUTDOWN_TIMEOUT_MS value", () => {
        process.env.SHUTDOWN_TIMEOUT_MS = "-1";
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: jest.fn() };
        close(server);
        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
    });
    it("falls back to 10000ms for SHUTDOWN_TIMEOUT_MS=0 (positivity guard)", () => {
        process.env.SHUTDOWN_TIMEOUT_MS = "0";
        jest.spyOn(log, "info").mockImplementation(jest.fn());
        jest.spyOn(log, "error").mockImplementation(jest.fn());
        const server = { close: jest.fn() };
        close(server);
        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
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
    // Since 0.3.1 listen() also registers server.on("error", ...) so mocks
    // must provide an .on stub. Factored out to keep these existing tests
    // focused on PORT parsing rather than mock plumbing.
    function makeServer() {
        return { close: originalClose, on: jest.fn() };
    }
    it("should log and register signal handlers on listen", () => {
        const app = {
            listen: jest.fn((port, cb) => {
                cb && cb();
                return makeServer();
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
                return makeServer();
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
                return makeServer();
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
                return makeServer();
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
                return makeServer();
            })
        };
        listen(app);
        expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
        delete process.env.PORT;
    });
    it("invokes the lazy log arrow and signal handlers exactly as wired (function-coverage sanity)", () => {
        // Every consumer of servpico exercises these arrows in production but
        // the mocks intercept them by default, leaving them 0-cover. This test
        // synthetically invokes each captured arrow to prove the wiring — the
        // log-info lambda renders correctly, and each signal-handler arrow
        // delegates to close(server). Global setTimeout/setImmediate are
        // stubbed for the duration because close() now schedules a
        // force-exit timer that we don't want to actually arm here.
        const originalSetTimeout = global.setTimeout;
        const originalSetImmediate = global.setImmediate;
        global.setTimeout = jest.fn(() => ({ unref: jest.fn() }));
        global.setImmediate = jest.fn();
        try {
            const server = { close: jest.fn(), on: jest.fn() };
            const app = {
                listen: jest.fn((_port, cb) => {
                    cb && cb();
                    return server;
                })
            };
            listen(app);
            // 1. The lazy log arrow passed to log.info renders the expected string.
            const lazyLogArg = mockLogInfo.mock.calls[0][0];
            expect(typeof lazyLogArg).toBe("function");
            expect(lazyLogArg()).toEqual(
                expect.stringContaining("[servpico-express] App listening on port")
            );
            // 2. Each signal handler is `() => close(server)` — invoking it must
            //    trigger server.close (proving the arrow captures the right ref).
            const sigCalls = process.once.mock.calls.filter((c) =>
                ["SIGTERM", "SIGINT", "SIGHUP"].includes(c[0])
            );
            expect(sigCalls).toHaveLength(3);
            for (const [, handler] of sigCalls) {
                server.close.mockClear();
                handler();
                expect(server.close).toHaveBeenCalledTimes(1);
            }
        } finally {
            global.setTimeout = originalSetTimeout;
            global.setImmediate = originalSetImmediate;
        }
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

describe("listen error handling", () => {
    // These tests exercise the server.on('error', ...) branch added in 0.3.1.
    // Prior to 0.3.1, bind failures (EADDRINUSE, EACCES) bypassed the
    // servpico log format entirely and crashed via Node's default handler.
    let originalProcessOnce;
    let originalExit;
    let originalSetImmediate;
    let mockLogInfo;
    let mockLogError;
    beforeAll(() => {
        originalProcessOnce = process.once;
        originalExit = process.exit;
        originalSetImmediate = global.setImmediate;
        process.once = jest.fn();
        process.exit = jest.fn();
    });
    afterAll(() => {
        process.once = originalProcessOnce;
        process.exit = originalExit;
        global.setImmediate = originalSetImmediate;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogInfo = jest.spyOn(log, "info").mockImplementation(jest.fn());
        mockLogError = jest.spyOn(log, "error").mockImplementation(jest.fn());
        global.setImmediate = jest.fn();
    });

    function makeApp({ invokeSuccess }) {
        const handlers = {};
        const app = {
            listen: jest.fn((port, cb) => {
                if (invokeSuccess && cb) cb();
                return {
                    close: jest.fn(),
                    on: (event, handler) => {
                        handlers[event] = handler;
                    },
                };
            }),
        };
        return { app, handlers };
    }

    it("always registers a server 'error' listener", () => {
        const { app, handlers } = makeApp({ invokeSuccess: true });
        listen(app);
        expect(handlers.error).toBeInstanceOf(Function);
    });

    it("routes pre-bind errors through failFast ('App cannot start: ...')", () => {
        // Bind failure: app.listen() returns a server but its success callback
        // is never invoked (listening === false when 'error' fires).
        const { app, handlers } = makeApp({ invokeSuccess: false });
        listen(app);
        const bindErr = Object.assign(new Error("listen EADDRINUSE :::3000"), {
            code: "EADDRINUSE",
        });
        handlers.error(bindErr);
        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("App cannot start: listen EADDRINUSE :::3000")
        );
        expect(process.exit).not.toHaveBeenCalled();
        const scheduled = global.setImmediate.mock.calls.find(
            (c) => typeof c[0] === "function"
        )[0];
        scheduled();
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("routes post-bind errors as 'Server error after listening: ...'", () => {
        // Post-bind: success callback fires first (sets listening=true), THEN
        // an error is emitted. Distinct log phrasing aids post-incident grep
        // ("did the app ever start?" answered cleanly).
        const { app, handlers } = makeApp({ invokeSuccess: true });
        listen(app);
        const runtimeErr = Object.assign(new Error("EMFILE: too many open files"), {
            code: "EMFILE",
        });
        handlers.error(runtimeErr);
        expect(mockLogError).toHaveBeenCalledWith(
            expect.stringContaining("Server error after listening: EMFILE: too many open files")
        );
        // Must NOT be logged as "App cannot start" — the app did start.
        expect(mockLogError).not.toHaveBeenCalledWith(
            expect.stringContaining("App cannot start")
        );
        expect(process.exit).not.toHaveBeenCalled();
        const scheduled = global.setImmediate.mock.calls.find(
            (c) => typeof c[0] === "function"
        )[0];
        scheduled();
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("prefixes the pre-bind error log with '[servpico-express] ' for greppability", () => {
        const { app, handlers } = makeApp({ invokeSuccess: false });
        listen(app);
        handlers.error(new Error("listen EACCES :::80"));
        expect(mockLogError.mock.calls[0][0]).toEqual(
            expect.stringContaining("[servpico-express] ")
        );
    });

    it("prefixes the post-bind error log with '[servpico-express] ' for greppability", () => {
        const { app, handlers } = makeApp({ invokeSuccess: true });
        listen(app);
        handlers.error(new Error("post-listen boom"));
        expect(mockLogError.mock.calls[0][0]).toEqual(
            expect.stringContaining("[servpico-express] ")
        );
    });

    it("does not fire the error path when listen() succeeds without emitting 'error'", () => {
        // Sanity check: the mere presence of the error listener must not
        // trigger logAndExit / process.exit under happy-path conditions.
        const { app } = makeApp({ invokeSuccess: true });
        listen(app);
        expect(mockLogError).not.toHaveBeenCalled();
        expect(global.setImmediate).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
        expect(mockLogInfo).toHaveBeenCalledWith(expect.any(Function));
    });
});
