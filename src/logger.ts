import fs from "node:fs/promises";
import path from "node:path";
import { Request } from "express";
import { LoggerClass } from "./types";

export class Logger implements LoggerClass {
  directory: string;

  constructor(dir_path: string) {
    this.directory = dir_path;
  }

  async log(request: Request) {
    const date = new Date();
    const fileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.log`;
    const filePath = path.join(this.directory, fileName);
    const success = (request.statusCode as number) < 400 ? "Success" : "Failed";

    await fs.appendFile(
      filePath,
      `${date.toISOString()} - ${request.ip} - ${request.url} - ${success}\n`
    );
  }

  async createDirectoryIfDoesNotExist(directory: string) {
    try {
      await fs.mkdir(directory);
    } catch (error: any) {
      if (error.code === "EEXIST") return;
      throw new Error("Error creating logs directory");
    }
  }
}
