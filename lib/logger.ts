type LogLevel = "debug" | "info" | "warn" | "error"

type LogMeta = Record<string, unknown>

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const defaultLevel = (process.env.LOG_LEVEL as LogLevel) || "info"
const redactEnabled = (process.env.LOG_REDACT_PII || "true") === "true"

const isServer = typeof window === "undefined"

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 4) {
    return value
  }
  const last4 = digits.slice(-4)
  return value.replace(digits, `****${last4}`)
}

function redactString(value: string): string {
  if (!redactEnabled) {
    return value
  }

  const emailRedacted = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
  const phoneRedacted = emailRedacted.replace(/\+?\d[\d\s\-()]{7,}\d/g, (match) => maskPhone(match))
  return phoneRedacted
}

function redactMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta || !redactEnabled) {
    return meta
  }

  const redactValue = (val: unknown): unknown => {
    if (typeof val === "string") {
      return redactString(val)
    }
    if (Array.isArray(val)) {
      return val.map((item) => redactValue(item))
    }
    if (val && typeof val === "object") {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(val)) {
        result[key] = redactValue(value)
      }
      return result
    }
    return val
  }

  return redactValue(meta) as LogMeta
}

async function writeLogFile(line: string): Promise<void> {
  if (!isServer) {
    return
  }

  try {
    const [{ default: fs }, { default: path }] = await Promise.all([
      import("fs/promises"),
      import("path"),
    ])

    const logsDir = path.join(process.cwd(), "Logs")
    await fs.mkdir(logsDir, { recursive: true })

    const date = new Date().toISOString().slice(0, 10)
    const filePath = path.join(logsDir, `${date}.log`)
    await fs.appendFile(filePath, line + "\n", "utf8")
  } catch (error) {
    console.error("Failed to write log file:", error)
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[defaultLevel]
}

function formatLine(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString()
  const payload = meta ? ` ${JSON.stringify(meta)}` : ""
  return `[${timestamp}] ${level.toUpperCase()} ${message}${payload}`
}

function log(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) {
    return
  }

  const safeMessage = redactString(message)
  const safeMeta = redactMeta(meta)
  const line = formatLine(level, safeMessage, safeMeta)

  const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log
  consoleFn(line)

  void writeLogFile(line)
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    log("debug", message, meta)
  },
  info(message: string, meta?: LogMeta) {
    log("info", message, meta)
  },
  warn(message: string, meta?: LogMeta) {
    log("warn", message, meta)
  },
  error(message: string, meta?: LogMeta) {
    log("error", message, meta)
  },
}
