import { logger } from "@/lib/logger"
import { db } from "./db"

logger.info("Checking 'users' table content")

try {
  const users = db.prepare('SELECT id, name, email, role FROM users LIMIT 10').all()
  logger.info("Sample records from users table", { users })
  
  logger.warn("This table is not in the current schema (db.ts)")
  logger.info("Current schema tables", { tables: ["buyers", "sellers", "inquiries", "inquiry_items", "offers"] })
  logger.info("Safe to drop this table? (yes/no)")
  logger.info("To remove it, update the clear-db.ts script to drop it.")
} catch (error) {
  logger.error("Error reading users table", { error: (error as Error)?.message })
}

db.close()
