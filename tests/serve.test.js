import { close } from "../dist/servpico-express.js";
import { log } from "@dwtechs/winstan";
import { listen } from "../src/serve";

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
    beforeAll(() => {
        originalProcessOn = process.on;
        originalClose = jest.fn();
        process.on = jest.fn();
    });
    afterAll(() => {
        process.on = originalProcessOn;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should log and register signal handlers on listen", () => {
        const mockLogInfo = jest.spyOn(require("@dwtechs/winstan"), "log").info.mockImplementation(jest.fn());
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
