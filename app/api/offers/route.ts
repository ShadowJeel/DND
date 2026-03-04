import { logger } from "@/lib/logger"
import { acceptOffer, closeInquiry, createOffer, disqualifyOffer, getInquiryById, getOfferById, getOffersByInquiryId, getOffersBySellerId, getUserById } from "@/lib/store"
import { notifyBuyerOfAcceptance, notifyBuyerOfNewOffer, notifySellerOfAcceptance, notifySellerOfRejection } from "@/lib/whatsapp"
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
    // Proceed directly to finding stakeholders for WhatsApp notifications.

    // Send WhatsApp notification to buyer about new offer
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

      if (!buyer.phone || buyer.phone.trim() === "") {
        logger.error("Buyer phone missing for offer notification", { buyerId: buyer.id })
        return NextResponse.json({ success: true }, { status: 201 })
      }

      logger.info("Notifying buyer of new offer", { buyerId: buyer.id, buyerPhone: buyer.phone })

      await notifyBuyerOfNewOffer(
        buyer.phone,
        inquiryId,
        pricePerTon
      )

      logger.info("New offer notification sent to buyer")
    } catch (whatsappError) {
      logger.error("Failed to send WhatsApp notification for new offer", { error: (whatsappError as Error)?.message })
      // Don't fail the request if WhatsApp fails
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
          if (seller && seller.phone) {
            await notifySellerOfRejection(seller.phone, offer.inquiryId)
          }
        }
      } catch (e) {
        logger.error("Failed to notify seller of rejection", { error: e })
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "accept" && body.offerId) {
      logger.info("Accepted offer Whatsapp routine started", { offerId: body.offerId })

      // Send WhatsApp notifications to seller and buyer
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

        logger.info("Offer accepted", { inquiryId: offer.inquiryId })

        if (seller && inquiry && buyer) {
          if (!seller.phone || seller.phone.trim() === "") {
            logger.error("Seller phone missing for acceptance", { sellerId: seller.id })
          }
          if (!buyer.phone || buyer.phone.trim() === "") {
            logger.error("Buyer phone missing for acceptance", { buyerId: buyer.id })
          }

          // Send notification to seller with buyer's contact number
          logger.info("Notifying seller with buyer contact", { sellerId: seller.id, sellerPhone: seller.phone, buyerPhone: buyer.phone })
          await notifySellerOfAcceptance(
            seller.phone,
            offer.inquiryId,
            buyer.name,
            buyer.phone
          )
          logger.info("Acceptance notification sent to seller")

          // Send notification to buyer with seller's contact number
          logger.info("Notifying buyer with seller contact", { buyerId: buyer.id, buyerPhone: buyer.phone, sellerPhone: seller.phone })
          await notifyBuyerOfAcceptance(
            buyer.phone,
            offer.inquiryId,
            seller.name,
            seller.phone
          )
          logger.info("Acceptance notification sent to buyer")
        } else {
          logger.warn("Missing required data for acceptance", { seller: !!seller, buyer: !!buyer, inquiry: !!inquiry })
        }
      } catch (whatsappError) {
        logger.error("Failed to send WhatsApp notification for acceptance", { error: (whatsappError as Error)?.message })
        // Don't fail the request if WhatsApp fails
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    logger.error("Error updating offer", { error: error?.message })
    return NextResponse.json({ error: error.message || "Failed to update offer" }, { status: 500 })
  }
}
