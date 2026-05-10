const { listen, close } = require("../dist/servpico-express.js");
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
