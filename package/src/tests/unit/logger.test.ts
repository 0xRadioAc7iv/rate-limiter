import fs from "node:fs/promises";
import path from "node:path";
import { Logger } from "../../core/logger";
import { Request } from "express";
import { FastifyReply } from "fastify";

jest.mock("node:fs/promises");

describe("tests logger", () => {
  const logDirectory = "./logs/";

  let logger: Logger;
  let mockRequest: Partial<Request>;
  let mockReply: Partial<FastifyReply>;
  let date: Date;
  let fileName: string;
  let filePath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new Logger(logDirectory);
    date = new Date();
    fileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.log`;
    filePath = path.join("./logs", fileName);
    mockRequest = { ip: "127.0.0.1", url: "/test" };
    mockReply = {};
  });

  test("should create directory if it does not exist", async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    await expect(
      logger.createDirectoryIfDoesNotExist(logDirectory)
    ).resolves.not.toThrow();

    expect(fs.mkdir).toHaveBeenCalledWith(logDirectory);
  });

  test("should return without throwing when directory already exists (EEXIST)", async () => {
    (fs.mkdir as jest.Mock).mockRejectedValue({ code: "EEXIST" });

    await expect(
      logger.createDirectoryIfDoesNotExist("./logs")
    ).resolves.toBeUndefined();
  });

  test("should throw an error when mkdir fails with another error", async () => {
    (fs.mkdir as jest.Mock).mockRejectedValue(new Error("Some other error"));

    await expect(
      logger.createDirectoryIfDoesNotExist("./logs")
    ).rejects.toThrow("Error creating logs directory");
  });

  test("should log 'Failed' when reply is given with statusCode > 400", async () => {
    mockReply.statusCode = 500;

    await logger.log(mockRequest as Request, mockReply as FastifyReply);

    expect(fs.appendFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining("127.0.0.1 - /test - Failed")
    );
  });

  test("should log 'Success' when reply is given with statusCode < 400", async () => {
    mockReply.statusCode = 200;

    await logger.log(mockRequest as Request, mockReply as FastifyReply);

    expect(fs.appendFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining("127.0.0.1 - /test - Success")
    );
  });

  test("should log 'Failed' when reply is not given and request statusCode > 400", async () => {
    (mockRequest as any).statusCode = 500;

    await logger.log(mockRequest as Request);

    expect(fs.appendFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining("127.0.0.1 - /test - Failed")
    );
  });

  test("should log 'Success' when reply is not given and request statusCode < 400", async () => {
    (mockRequest as any).statusCode = 200;

    await logger.log(mockRequest as Request);

    expect(fs.appendFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining("127.0.0.1 - /test - Success")
    );
  });
});
