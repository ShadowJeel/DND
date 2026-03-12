import { logger } from "@/lib/logger"
import { acceptOffer, closeInquiry, createOffer, disqualifyOffer, getInquiryById, getOfferById, getOffersByInquiryId, getOffersBySellerId, getUserById } from "@/lib/store"
import { notifyBuyerOfAcceptanceEmail, notifyBuyerOfNewOfferEmail, notifySellerOfAcceptanceEmail, notifySellerOfRejectionEmail } from "@/lib/email"
import { notifyBuyerOfAcceptanceSMS, notifyBuyerOfNewOfferSMS, notifySellerOfAcceptanceSMS, notifySellerOfRejectionSMS } from "@/lib/sms"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const inquiryId = searchParams.get("inquiryId")
    const sellerId = searchParams.get("sellerId")

    if (sellerId) {
      const offers = await getOffersBySellerId(sellerId)
      return NextResponse.json(offers)
    }

    if (inquiryId) {
      const offers = await getOffersByInquiryId(inquiryId)
      return NextResponse.json(offers)
    }

    return NextResponse.json({ error: "inquiryId or sellerId required" }, { status: 400 })
  } catch (error: any) {
    logger.error("Error fetching offers", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to fetch offers" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { inquiryId, inquiryItemId, sellerId, sellerName, pricePerTon, comments, pdfUrl, contactEmail, contactPhone } = body

    if (!inquiryId || !inquiryItemId || !sellerId || !pricePerTon) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Client has already created the offer document.
    // Proceed directly to finding stakeholders for Email/SMS notifications.

    // Send notification to buyer about new offer
    try {
      logger.info("New offer submitted", { inquiryId })

      const inquiry = await getInquiryById(inquiryId)

      if (!inquiry) {
        logger.error("Inquiry not found for offer notification", { inquiryId })
        return NextResponse.json({ success: true }, { status: 201 })
      }

      logger.debug("Inquiry found for offer notification", { inquiryId: inquiry.id, buyerId: inquiry.buyerId })

      const buyer = await getUserById(inquiry.buyerId)

      if (!buyer) {
        logger.error("Buyer not found for offer notification", { buyerId: inquiry.buyerId })
        return NextResponse.json({ success: true }, { status: 201 })
      }

      logger.info("Notifying buyer of new offer", { buyerId: buyer.id })

      // Send Email if available
      if (buyer.email) {
        await notifyBuyerOfNewOfferEmail(buyer.email, inquiryId).catch(e =>
          logger.error("Failed to send Email notification for new offer", { error: e.message })
        )
      }

      // Send SMS if available
      if (buyer.phone && buyer.phone.trim() !== "") {
        await notifyBuyerOfNewOfferSMS(buyer.phone, inquiryId).catch(e =>
          logger.error("Failed to send SMS notification for new offer", { error: e.message })
        )
      }

      logger.info("New offer notifications sent to buyer")
    } catch (notificationError) {
      logger.error("Failed to send notification for new offer", { error: (notificationError as Error)?.message })
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    logger.error("Error creating offer", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to create offer" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()

    if (body.action === "disqualify" && body.offerId) {
      // Client has already disqualified. Notify seller of rejection.

      // Notify seller of rejection
      try {
        const offer = await getOfferById(body.offerId)
        if (offer) {
          const seller = await getUserById(offer.sellerId)
          if (seller) {
            if (seller.email) await notifySellerOfRejectionEmail(seller.email, offer.id).catch(e => logger.error("Failed rejection email", { error: (e as Error).message }))
            if (seller.phone) await notifySellerOfRejectionSMS(seller.phone, offer.id).catch(e => logger.error("Failed rejection SMS", { error: (e as Error).message }))
          }
        }
      } catch (e) {
        logger.error("Failed to notify seller of rejection", { error: e })
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "accept" && body.offerId) {
      logger.info("Accepted offer routine started", { offerId: body.offerId })

      // Send notifications to seller and buyer
      try {
        const offer = await getOfferById(body.offerId)
        if (!offer) {
          logger.error("Offer not found for acceptance", { offerId: body.offerId })
          return NextResponse.json({ success: true })
        }

        logger.debug("Offer details", { sellerId: offer.sellerId, inquiryId: offer.inquiryId })

        const seller = await getUserById(offer.sellerId)
        const inquiry = await getInquiryById(offer.inquiryId)
        const buyer = inquiry ? await getUserById(inquiry.buyerId) : null

        if (!seller) {
          logger.error("Seller not found for acceptance", { sellerId: offer.sellerId })
        }
        if (!inquiry) {
          logger.error("Inquiry not found for acceptance", { inquiryId: offer.inquiryId })
        }
        if (!buyer) {
          logger.error("Buyer not found for acceptance")
        }

        logger.info("Offer accepted", { offerId: offer.id })

        if (seller && inquiry && buyer) {
          // Send notification to seller
          logger.info("Notifying seller", { sellerId: seller.id })
          if (seller.email) {
            await notifySellerOfAcceptanceEmail(seller.email, offer.id).catch(e => logger.error("Email seller acceptance failed", { error: (e as Error).message }))
          }
          if (seller.phone && seller.phone.trim() !== "") {
            if (seller.smsNotificationsEnabled) {
              await notifySellerOfAcceptanceSMS(seller.phone, offer.id).catch(e => logger.error("SMS seller acceptance failed", { error: (e as Error).message }))
            } else {
              logger.info("Skipping SMS notification for seller as it is disabled in profile", { sellerId: seller.id })
            }
          }
          logger.info("Acceptance notifications sent to seller")

          // Send notification to buyer
          logger.info("Notifying buyer", { buyerId: buyer.id })
          if (buyer.email) {
            await notifyBuyerOfAcceptanceEmail(buyer.email, offer.id).catch(e => logger.error("Email buyer acceptance failed", { error: (e as Error).message }))
          }
          if (buyer.phone && buyer.phone.trim() !== "") {
            await notifyBuyerOfAcceptanceSMS(buyer.phone, offer.id).catch(e => logger.error("SMS buyer acceptance failed", { error: (e as Error).message }))
          }
          logger.info("Acceptance notifications sent to buyer")
        } else {
          logger.warn("Missing required data for acceptance", { seller: !!seller, buyer: !!buyer, inquiry: !!inquiry })
        }
      } catch (notificationError) {
        logger.error("Failed to send notification for acceptance", { error: (notificationError as Error)?.message })
        // Don't fail the request if notification fails
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    logger.error("Error updating offer", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to update offer" }, { status: 500 })
  }
}
