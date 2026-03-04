import { logger } from "@/lib/logger"
import { db } from "./db"

// View database statistics and content summary
logger.info("Database statistics")

// Buyers
const buyerCount = db.prepare("SELECT COUNT(*) as count FROM buyers").get() as { count: number }
logger.info("Buyers", { count: buyerCount.count })
const buyers = db.prepare("SELECT id, name, email FROM buyers").all()
buyers.forEach((u: any) => {
  logger.info("Buyer", { id: u.id, name: u.name, email: u.email })
})

// Sellers
const sellerCount = db.prepare("SELECT COUNT(*) as count FROM sellers").get() as { count: number }
logger.info("Sellers", { count: sellerCount.count })
const sellers = db.prepare("SELECT id, name, email FROM sellers").all()
sellers.forEach((u: any) => {
  logger.info("Seller", { id: u.id, name: u.name, email: u.email })
})

// Inquiries
logger.info("Inquiries")
const inquiries = db.prepare("SELECT id, buyer_name, status, created_at FROM inquiries ORDER BY created_at DESC").all()
inquiries.forEach((i: any) => {
  const itemCount = db.prepare("SELECT COUNT(*) as count FROM inquiry_items WHERE inquiry_id = ?").get(i.id) as { count: number }
  logger.info("Inquiry", { id: i.id, buyerName: i.buyer_name, status: i.status, itemCount: itemCount.count })
})

// Offers
logger.info("Offers")
const offers = db.prepare("SELECT id, inquiry_id, seller_name, price_per_ton, status FROM offers ORDER BY created_at DESC").all()
offers.forEach((o: any) => {
  logger.info("Offer", { id: o.id, sellerName: o.seller_name, inquiryId: o.inquiry_id, pricePerTon: o.price_per_ton, status: o.status })
})

logger.info("Database query successful")

db.close()
