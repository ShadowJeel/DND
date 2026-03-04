import { logger } from "@/lib/logger"
import { activateBidding, closeInquiry, deleteInquiryItem, getInquiryById, getSellerPhonesFromOffers, updateInquiryItem } from "@/lib/store"
import { notifySellersOfBidding } from "@/lib/whatsapp"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const inquiry = await getInquiryById(id)
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
    }
    return NextResponse.json(inquiry)
  } catch (error: any) {
    logger.error("Error fetching inquiry", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to fetch inquiry" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    if (body.action === "activate-bidding") {
      const durationInDays = body.durationInDays || 3 // Default 3 days
      await activateBidding(id, durationInDays)

      // Send WhatsApp notifications to all sellers who submitted offers
      try {
        const inquiry = await getInquiryById(id)
        if (inquiry) {
          const sellerPhones = await getSellerPhonesFromOffers(id)

          logger.info("Bidding activated", { inquiryId: id, sellerCount: sellerPhones.length })

          if (sellerPhones.length > 0) {
            // Create detailed items string with product
            const itemsStr = inquiry.items.map(i =>
              `${i.product}`
            ).join("\n   • ")

            const deadline = new Date()
            deadline.setDate(deadline.getDate() + durationInDays)

            await notifySellersOfBidding(sellerPhones, id, deadline, itemsStr)
            logger.info("Bidding notifications sent")
          } else {
            logger.warn("No sellers with offers to notify for bidding", { inquiryId: id })
          }
        }
      } catch (whatsappError) {
        logger.error("Failed to send WhatsApp notifications for bidding", { error: (whatsappError as Error)?.message })
        // Don't fail the request if WhatsApp fails
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "close") {
      await closeInquiry(id)
      return NextResponse.json({ success: true })
    }

    if (body.action === "update-item" && body.itemId) {
      await updateInquiryItem(id, body.itemId, body.data)
      return NextResponse.json({ success: true })
    }

    if (body.action === "delete-item" && body.itemId) {
      await deleteInquiryItem(id, body.itemId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    logger.error("Error updating inquiry", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to update inquiry" }, { status: 500 })
  }
}
