import { Request } from "express";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Writes logs for incoming requests to a specified directory.
 *
 * @param {string} directory - The directory where the log file will be stored.
 * @param {Request} request - The Express request object to log.
 * @returns {Promise<void>} - A promise that resolves once the log has been written.
 *
 * @throws {Error} - Throws an error if writing to the log file fails.
 */
export const writeLogs = async (
  directory: string,
  request: Request
): Promise<void> => {
  const date = new Date();
  const fileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.log`;
  const filePath = path.join(directory, fileName);
  const success = (request.statusCode as number) < 400 ? "Success" : "Failed";

  await fs.appendFile(
    filePath,
    `${date.toISOString()} - ${request.ip} - ${request.url} - ${success}\n`
  );
};

/**
 * Creates a directory if it does not already exist.
 *
 * @param {string} directory - The directory path to create.
 * @returns {Promise<void>} - A promise that resolves once the directory is created or if it already exists.
 *
 * @throws {Error} - Throws an error if directory creation fails for reasons other than it already existing.
 */
export const createDirectoryIfNotExists = async (directory: string) => {
  try {
    await fs.mkdir(directory);
  } catch (error: any) {
    if (error.code === "EEXIST") return;
    throw new Error("Error creating logs directory");
  }
};
