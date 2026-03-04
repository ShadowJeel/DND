import { logger } from "@/lib/logger"
import { db } from "./db"

// Get all tables in the database
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all()

logger.info("Tables in database")
tables.forEach((table: any) => {
  logger.info("Table", { name: table.name })
})

// Check if users table exists
const usersTable = tables.find((t: any) => t.name === 'users')
if (usersTable) {
  logger.warn("'users' table found in database")
  
  // Check if it has any data
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  logger.info("Users table record count", { count: count.count })
  
  if (count.count === 0) {
    logger.info("Users table is empty and can be safely removed")
  } else {
    logger.warn("Users table contains data; review before removing")
  }
} else {
  logger.info("No 'users' table found; database is clean")
}

db.close()
