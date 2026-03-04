import { logger } from "@/lib/logger"
import { db } from "./db"

// Clear all data from tables
function clearDatabase() {
  logger.info("Clearing database")
  
  db.exec(`
    DELETE FROM offers;
    DELETE FROM inquiry_items;
    DELETE FROM inquiries;
    DELETE FROM buyers;
    DELETE FROM sellers;
  `)
  
  logger.info("All tables cleared successfully")
  logger.info("Database is now empty")
}

clearDatabase()
db.close()
