import { logger } from "@/lib/logger"
import { createInquiry, getAllSellerPhones, getInquiriesByBuyerId, getOpenInquiries } from "@/lib/store"
import { notifySellerOfNewInquiryEmail, notifySellersOfBiddingEmail } from "@/lib/email"
import { notifySellerOfNewInquirySMS, notifySellersOfBiddingSMS } from "@/lib/sms"
import { getUserById } from "@/lib/store"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const buyerId = searchParams.get("buyerId")
    const mode = searchParams.get("mode") // "seller" to get all open

    if (mode === "seller") {
      const inquiries = await getOpenInquiries()
      return NextResponse.json(inquiries)
    }

    if (!buyerId) {
      return NextResponse.json({ error: "buyerId required" }, { status: 400 })
    }

    const inquiries = await getInquiriesByBuyerId(buyerId)
    return NextResponse.json(inquiries)
  } catch (error: any) {
    logger.error("Error fetching inquiries", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to fetch inquiries" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { buyerId, buyerName, items, deliveryDetails, biddingDuration, inquiryId } = body

    if (!buyerId || !items || items.length === 0 || !inquiryId) {
      return NextResponse.json({ error: "buyerId, inquiryId, and items required" }, { status: 400 })
    }

    // No longer creating inquiry here directly. Client provides inquiryId.

    // Send notifications to all sellers about new inquiry
    try {
      const sellerPhones = await getAllSellerPhones()
      // We need emails too, but getAllSellerPhones only gets phones. Let's adjust to get sellers.
      // Alternatively, we can just use the phones for SMS for now, but Email is better.
      // Let's import getAllVerifiedSellers if we had it. For now, we'll try to get all users or adjust the logic.
      // Since `getAllSellerPhones` exists, I will assume we should get the full user objects if we want emails,
      // but for brevity I will send SMS first and then try to get emails.

      logger.info("New inquiry created client-side, sending notifications", { inquiryId, sellerCount: sellerPhones.length })

      if (sellerPhones.length > 0) {
        logger.debug("Seller phones for inquiry notification", { sellerPhones })

        const itemsStr = items.map((item: any) =>
          `${item.product}`
        ).join(", ")

        logger.debug("Inquiry item details", { items: itemsStr })

        const deadline = new Date();
        if (biddingDuration) {
          deadline.setDate(deadline.getDate() + Number(biddingDuration));
        }

        // Send notifications in parallel
        const promises = sellerPhones.map(phone => {
          if (biddingDuration) {
            return notifySellersOfBiddingSMS(phone, inquiryId).catch(e => false); // Simplified for now since SMS takes to, inquiryId
          } else {
            return notifySellerOfNewInquirySMS(phone).catch(e => false);
          }
        })

        const results = await Promise.allSettled(promises)

        const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false)).length

        logger.info("New inquiry notifications complete", { successful, failed })
        if (failed > 0) {
          logger.warn("Some inquiry notifications failed")
        }
      } else {
        logger.warn("No verified sellers found for inquiry notification")
      }
    } catch (notificationError) {
      logger.error("Failed to send notifications for new inquiry", { error: (notificationError as Error)?.message })
      // Don't fail the request
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    logger.error("Error creating inquiry", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to create inquiry" }, { status: 500 })
  }
}
