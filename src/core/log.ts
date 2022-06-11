export enum LogLevel {
  Info,
  Error,
  Success,
}

export interface ILogEntry {
  level: LogLevel
  event: string
  subject?: string
  detail?: string
  status?: number
  error?: string | Error
  timeTakenMs?: number
}
