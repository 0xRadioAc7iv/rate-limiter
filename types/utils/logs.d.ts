import { Request } from "express";
/**
 * Writes logs for incoming requests to a specified directory.
 *
 * @param {string} directory - The directory where the log file will be stored.
 * @param {Request} request - The Express request object to log.
 * @returns {Promise<void>} - A promise that resolves once the log has been written.
 *
 * @throws {Error} - Throws an error if writing to the log file fails.
 */
export declare const writeLogs: (directory: string, request: Request) => Promise<void>;
/**
 * Creates a directory if it does not already exist.
 *
 * @param {string} directory - The directory path to create.
 * @returns {Promise<void>} - A promise that resolves once the directory is created or if it already exists.
 *
 * @throws {Error} - Throws an error if directory creation fails for reasons other than it already existing.
 */
export declare const createDirectoryIfNotExists: (directory: string) => Promise<void>;
