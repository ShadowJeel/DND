import { logger } from "@/lib/logger"
import { db } from "./db"

logger.info("Removing unused 'users' table from database")

try {
  // Check if table exists
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='users'
  `).all()

  if (tables.length > 0) {
    // Drop the users table
    db.exec('DROP TABLE IF EXISTS users')
    logger.info("Successfully dropped 'users' table")
    
    // Verify it's gone
    const remainingTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all()
    
    logger.info("Remaining tables")
    remainingTables.forEach((table: any) => {
      logger.info("Table", { name: table.name })
    })
    
    logger.info("Database cleaned successfully")
  } else {
    logger.info("'users' table does not exist")
  }
} catch (error) {
  logger.error("Error dropping users table", { error: (error as Error)?.message })
}

db.close()
