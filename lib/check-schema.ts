import { logger } from "@/lib/logger"
import { db } from "./db"

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
logger.info("Database tables")
tables.forEach((t: any) => logger.info("Table", { name: t.name }))

// Try to check if there are any triggers or views that reference 'users'
const triggers = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='trigger'").all()
logger.info("Triggers")
if (triggers.length === 0) {
  logger.info("No triggers found")
} else {
  triggers.forEach((t: any) => logger.info("Trigger", { name: t.name, table: t.tbl_name }))
}

const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all()
logger.info("Views")
if (views.length === 0) {
  logger.info("No views found")
} else {
  views.forEach((v: any) => logger.info("View", { name: v.name }))
}

db.close()
