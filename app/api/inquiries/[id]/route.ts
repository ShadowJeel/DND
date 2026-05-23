import { logger } from "@/lib/logger"
import { activateBidding, closeInquiry, deleteInquiryItem, getInquiryById, getSellerContactInfoFromOffers, updateInquiryItem, getUserById, startBidding, getSellersContactInfoByCategories, softDeleteInquiry, getVerifiedNotificationEmails } from "@/lib/store"
import { notifySellersOfBiddingEmail, notifyBuyerOfInquiryClosedEmail, notifySellerOfInquiryClosedEmail, notifyBuyerOfInquiryDeletedEmail, notifySellerOfInquiryDeletedEmail } from "@/lib/email"
import { notifySellersOfBiddingSMS, notifyBuyerOfInquiryClosedSMS, notifySellerOfInquiryClosedSMS, notifyBuyerOfInquiryDeletedSMS, notifySellerOfInquiryDeletedSMS } from "@/lib/sms"
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

    if (body.action === "start-bidding") {
      const durationInDays = body.durationInDays || 3
      await startBidding(id, durationInDays)

      // Send notifications to all sellers who have selected this product in My Products (categories)
      try {
        const inquiry = await getInquiryById(id)
        if (inquiry) {
          const categories = Array.from(new Set(inquiry.items.map((item: any) => item.product))) as string[]
          const sellerContacts = await getSellersContactInfoByCategories(categories)

          logger.info("Bidding started, notifying matching sellers", { inquiryId: id, sellerCount: sellerContacts.length })

          if (sellerContacts.length > 0) {
            const productName = inquiry.items[0]?.product || "Product";
            await Promise.all(sellerContacts.map(async (contact) => {
              const tasks = []
              if (contact.phone) tasks.push(notifySellersOfBiddingSMS(contact.phone, id).catch(e => logger.error("Failed to send SMS", { error: (e as Error).message })))
              const targetEmails = contact.emails || [contact.email]
              targetEmails.forEach((email: string) => {
                if (email) tasks.push(notifySellersOfBiddingEmail(email, id, productName).catch(e => logger.error("Failed to send Email", { error: (e as Error).message })))
              })
              await Promise.all(tasks)
            }))
            logger.info("Bidding started notifications sent")
          } else {
            logger.warn("No verified sellers found for bidding start", { inquiryId: id })
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send notifications for bidding start", { error: (notificationError as Error)?.message })
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "activate-bidding") {
      const durationInDays = body.durationInDays || 3 // Default 3 days
      await activateBidding(id, durationInDays)

      // Send notifications to all sellers who submitted offers
      try {
        const inquiry = await getInquiryById(id)
        if (inquiry) {
          const sellerContacts = await getSellerContactInfoFromOffers(id)

          logger.info("Bidding activated", { inquiryId: id, sellerCount: sellerContacts.length })

          if (sellerContacts.length > 0) {
            const deadline = new Date()
            deadline.setDate(deadline.getDate() + durationInDays)

            await Promise.all(sellerContacts.map(async (contact) => {
              const productName = inquiry.items[0]?.product || "Product";
              const tasks = []
              if (contact.phone) tasks.push(notifySellersOfBiddingSMS(contact.phone, id).catch(e => logger.error("Failed to send SMS", { error: (e as Error).message })))
              const targetEmails = contact.emails || [contact.email]
              targetEmails.forEach((email: string) => {
                if (email) tasks.push(notifySellersOfBiddingEmail(email, id, productName).catch(e => logger.error("Failed to send Email", { error: (e as Error).message })))
              })
              await Promise.all(tasks)
            }))
            logger.info("Bidding notifications sent")
          } else {
            logger.warn("No sellers with offers to notify for bidding", { inquiryId: id })
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send notifications for bidding", { error: (notificationError as Error)?.message })
        // Don't fail the request if notification fails
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "close") {
      await closeInquiry(id)
      
      try {
        const inquiry = await getInquiryById(id)
        if (inquiry) {
          // Notify buyer
          const buyer = await getUserById(inquiry.buyerId)
          const productName = inquiry.items[0]?.product || "Product";
          
          if (buyer) {
            const verifiedEmails = getVerifiedNotificationEmails(buyer)
            const targetEmails = verifiedEmails.length > 0 ? verifiedEmails : [buyer.email]
            const emailPromises = targetEmails.map((email: string) =>
              notifyBuyerOfInquiryClosedEmail(email, id, productName).catch(() => {})
            )
            await Promise.allSettled(emailPromises)
            if (buyer.phone) await notifyBuyerOfInquiryClosedSMS(buyer.phone, id).catch(() => {})
          }
          
          // Notify sellers
          const sellerContacts = await getSellerContactInfoFromOffers(id)
          await Promise.all(sellerContacts.map(async (contact) => {
            const tasks = []
            if (contact.phone) tasks.push(notifySellerOfInquiryClosedSMS(contact.phone, id).catch(() => {}))
            const targetEmails = contact.emails || [contact.email]
            targetEmails.forEach((email: string) => {
              if (email) tasks.push(notifySellerOfInquiryClosedEmail(email, id, productName).catch(() => {}))
            })
            await Promise.all(tasks)
          }))
        }
      } catch (notificationError) {
        logger.error("Failed to send notifications for inquiry close", { error: (notificationError as Error)?.message })
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "delete") {
      const { userId } = body
      if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 })
      }
      await softDeleteInquiry(id, userId)

      try {
        const inquiry = await getInquiryById(id)
        if (inquiry) {
          // Notify buyer
          const buyer = await getUserById(inquiry.buyerId)
          const productName = inquiry.items[0]?.product || "Product";
          
          if (buyer) {
            const verifiedEmails = getVerifiedNotificationEmails(buyer)
            const targetEmails = verifiedEmails.length > 0 ? verifiedEmails : [buyer.email]
            const emailPromises = targetEmails.map((email: string) =>
              notifyBuyerOfInquiryDeletedEmail(email, id, productName).catch(() => {})
            )
            await Promise.allSettled(emailPromises)
            if (buyer.phone) await notifyBuyerOfInquiryDeletedSMS(buyer.phone, id).catch(() => {})
          }
          
          // Notify sellers who have submitted offers
          const sellerContacts = await getSellerContactInfoFromOffers(id)
          await Promise.all(sellerContacts.map(async (contact) => {
            const tasks = []
            if (contact.phone) tasks.push(notifySellerOfInquiryDeletedSMS(contact.phone, id).catch(() => {}))
            const targetEmails = contact.emails || [contact.email]
            targetEmails.forEach((email: string) => {
              if (email) tasks.push(notifySellerOfInquiryDeletedEmail(email, id, productName).catch(() => {}))
            })
            await Promise.all(tasks)
          }))
        }
      } catch (notificationError) {
        logger.error("Failed to send notifications for inquiry delete", { error: (notificationError as Error)?.message })
      }

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
