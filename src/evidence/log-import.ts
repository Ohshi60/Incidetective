import type { LogEntry } from "../../shared/types/evidence.js";

export type ImportedLog = Omit<LogEntry, "incidentId">;

export class LogImportError extends Error {
  constructor(
    public readonly line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = "LogImportError";
  }
}
