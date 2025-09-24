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
        expect(log.info).toHaveBeenCalledWith(expect.stringContaining("SIGTERM signal received"));
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
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining("Service cannot close properly"));
    });
});

describe("listen", () => {
    let originalProcessOn;
    let originalClose;
    let mockLogInfo;
    beforeAll(() => {
        originalProcessOn = process.on;
        process.on = jest.fn();
    });
    afterAll(() => {
        process.on = originalProcessOn;
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
        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining("App listening on port"));
        expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
        expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    });
});
