import { logger } from "@/lib/logger"
import { createInquiry, getAllSellerPhones, getInquiriesByBuyerId, getOpenInquiries, getSellersContactInfoByCategories, getInquiryById } from "@/lib/store"
import { notifySellerOfNewInquiryEmail, notifySellersOfBiddingEmail, sendInquirySubmissionReceiptEmail } from "@/lib/email"
import { notifySellerOfNewInquirySMS, notifySellersOfBiddingSMS } from "@/lib/sms"
import { getUserById, getVerifiedNotificationEmails } from "@/lib/store"
import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

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

    // 1. Fetch Buyer details and send receipt email to buyer's selected emails
    try {
      const buyer = await getUserById(buyerId)
      if (buyer) {
        if (buyer.password) {
          try {
            await signInWithEmailAndPassword(auth, buyer.email, buyer.password)
            logger.info("Server signed in successfully as buyer", { email: buyer.email })
          } catch (authErr: any) {
            logger.error("Failed server sign in as buyer", { email: buyer.email, error: authErr?.message })
          }
        } else {
          logger.warn("No password found on buyer profile, skipping server sign in", { buyerId })
        }

        const inquiry = await getInquiryById(inquiryId)
        if (inquiry) {
          // ensure buyerName is populated
          inquiry.buyerName = buyer.name || inquiry.buyerName || buyerName || "Buyer"
          
          const verifiedEmails = getVerifiedNotificationEmails(buyer)
          const targetEmails = verifiedEmails.length > 0 ? verifiedEmails : [buyer.email]
          
          logger.info("Sending inquiry receipt emails to buyer", {
            buyerId,
            inquiryId,
            targetEmails
          })
          
          const emailPromises = targetEmails.map((email: string) => 
            sendInquirySubmissionReceiptEmail(email, inquiry).catch((err) => {
              logger.error("Failed to send inquiry receipt email", { email, error: err?.message })
              return null
            })
          )
          await Promise.allSettled(emailPromises)
        } else {
          logger.warn("Inquiry not found for sending receipt email", { inquiryId })
        }
      } else {
        logger.warn("Buyer not found for sending receipt email", { buyerId })
      }
    } catch (emailError: any) {
      logger.error("Error in buyer notification receipt flow", { error: emailError?.message })
    }

    // Send notifications to targeted sellers about new inquiry
    try {
      const categories = Array.from(new Set(items.map((item: any) => item.product))) as string[]
      const sellerContacts = await getSellersContactInfoByCategories(categories)

      logger.info("New inquiry created, sending targeted notifications", {
        inquiryId,
        categories,
        targetedSellerCount: sellerContacts.length
      })

      if (sellerContacts.length > 0) {
        logger.debug("Seller contacts for inquiry notification", { count: sellerContacts.length })

        const deadline = new Date();
        if (biddingDuration) {
          deadline.setDate(deadline.getDate() + Number(biddingDuration));
        }

        const productName = items[0]?.product || "Product";
        // Send notifications in parallel
        const promises = sellerContacts.map((contact: any) => {
          const tasks = [];
          const targetEmails = contact.emails || [contact.email];
          if (biddingDuration) {
            if (contact.phone) tasks.push(notifySellersOfBiddingSMS(contact.phone, inquiryId).catch(() => false));
            targetEmails.forEach((email: string) => {
              if (email) tasks.push(notifySellersOfBiddingEmail(email, inquiryId, productName).catch(() => false));
            });
          } else {
            if (contact.phone) tasks.push(notifySellerOfNewInquirySMS(contact.phone).catch(() => false));
            targetEmails.forEach((email: string) => {
              if (email) tasks.push(notifySellerOfNewInquiryEmail(email, inquiryId, productName).catch(() => false));
            });
          }
          return Promise.allSettled(tasks);
        }).flat()

        const results = await Promise.allSettled(promises)
        
        logger.info("New inquiry notifications complete")
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
