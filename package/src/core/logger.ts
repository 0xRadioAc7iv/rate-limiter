import fs from "node:fs/promises";
import path from "node:path";
import { Request } from "express";
import { LoggerClass, RequestTypes } from "../lib/types";
import { FastifyReply } from "fastify";

/**
 * @class Logger
 * @implements {LoggerClass}
 * @description Logger class to handle request logging.
 */
export class Logger implements LoggerClass {
  directory: string;

  /**
   * @constructor
   * @param {string} dir_path - The directory path for logs.
   */
  constructor(dir_path: string) {
    this.directory = dir_path;
  }

  /**
   * Logs request details to a file.
   * @param {Request} request - The request object.
   * @returns {Promise<void>}
   */
  async log(request: RequestTypes, reply?: FastifyReply): Promise<void> {
    const date = new Date();
    const fileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.log`;
    const filePath = path.join(this.directory, fileName);
    const success = reply
      ? reply.statusCode < 400
        ? "Success"
        : "Failed"
      : ((request as Request).statusCode as number) < 400
      ? "Success"
      : "Failed";

    await fs.appendFile(
      filePath,
      `${date.toISOString()} - ${request.ip} - ${request.url} - ${success}\n`
    );
  }

  /**
   * Creates the log directory if it does not exist.
   * @returns {Promise<void>}
   */
  async createDirectoryIfDoesNotExist(): Promise<void> {
    try {
      await fs.mkdir(this.directory);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === "EEXIST") return;
      throw new Error("Error creating logs directory");
    }
  }
}
