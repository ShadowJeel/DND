import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { logger } from "@/lib/logger"
import { getAllSellerPhones } from "@/lib/store"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    logger.info("WhatsApp diagnostics started")

    // 1. Check environment variables
    logger.info("Checking Meta WhatsApp credentials")
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
    const businessAccountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID
    const testMode = process.env.WHATSAPP_TEST_MODE
    const testPhone = process.env.TEST_PHONE_NUMBER

    const credentials = {
      accessToken: accessToken ? "✅ SET" : "❌ NOT SET",
      phoneNumberId: phoneNumberId ? "✅ SET" : "❌ NOT SET",
      businessAccountId: businessAccountId ? "✅ SET" : "❌ NOT SET",
      testMode: testMode || "false",
      testPhone: testPhone || "not set"
    }
    logger.info("Meta credentials status", credentials)

    // 2. Check sellers in database
    logger.info("Checking sellers in database")
    let allSellers: any[] = []
    try {
      const sellersSnap = await getDocs(collection(db, "sellers"))
      allSellers = sellersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (sellersError: any) {
      logger.error("Error fetching sellers", { error: sellersError?.message })
      return NextResponse.json({
        success: false,
        error: "Failed to fetch sellers",
        details: sellersError
      }, { status: 500 })
    }

    logger.info("Total sellers in database", { count: allSellers?.length || 0 })
    if (allSellers && allSellers.length > 0) {
      logger.debug("Sample sellers")
      allSellers.slice(0, 3).forEach((seller: any) => {
        logger.debug("Seller", { id: seller.id, name: seller.name, phone: seller.phone, verified: seller.verified })
      })
    }

    // 3. Check verified sellers with phones
    logger.info("Checking verified sellers with phone numbers")
    const verifiedSellers = allSellers?.filter((s: any) => s.verified && s.phone && s.phone.trim() !== "")
    logger.info("Verified sellers with phone numbers", { count: verifiedSellers?.length || 0 })
    if (verifiedSellers && verifiedSellers.length > 0) {
      verifiedSellers.slice(0, 3).forEach((seller: any) => {
        logger.debug("Verified seller", { name: seller.name, phone: seller.phone })
      })
    }

    // 4. Get seller phones using the function
    logger.info("Testing getAllSellerPhones")
    const sellerPhones = await getAllSellerPhones()
    logger.info("Seller phones returned", { count: sellerPhones.length })
    if (sellerPhones.length > 0) {
      logger.debug("Sample seller phones", { phones: sellerPhones.slice(0, 3) })
    }

    // 5. Check buyers
    logger.info("Checking buyers in database")
    let allBuyers: any[] = []
    try {
      const buyersSnap = await getDocs(collection(db, "buyers"))
      allBuyers = buyersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (buyersError: any) {
      logger.error("Error fetching buyers", { error: buyersError?.message })
    }
    logger.info("Total buyers in database", { count: allBuyers?.length || 0 })
    if (allBuyers && allBuyers.length > 0) {
      logger.debug("Sample buyers")
      allBuyers.slice(0, 3).forEach((buyer: any) => {
        const hasPhone = buyer.phone && buyer.phone.trim() !== ""
        logger.debug("Buyer", { id: buyer.id, name: buyer.name, phone: buyer.phone, hasPhone })
      })
    }

    // 6. Check inquiries
    logger.info("Checking inquiries in database")
    let allInquiries: any[] = []
    try {
      const inqSnap = await getDocs(collection(db, "inquiries"))
      allInquiries = inqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 5)
    } catch (inquiriesError: any) {
      logger.error("Error fetching inquiries", { error: inquiriesError?.message })
    }
    logger.info("Sample inquiries", { count: allInquiries?.length || 0 })
    if (allInquiries && allInquiries.length > 0) {
      allInquiries.forEach((inq: any) => {
        logger.debug("Inquiry", { id: inq.id, buyerId: inq.buyer_id, status: inq.status })
      })
    }

    // 7. Check offers
    logger.info("Checking offers in database")
    let allOffers: any[] = []
    try {
      const offSnap = await getDocs(collection(db, "offers"))
      allOffers = offSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 5)
    } catch (offersError: any) {
      logger.error("Error fetching offers", { error: offersError?.message })
    }
    logger.info("Sample offers", { count: allOffers?.length || 0 })
    if (allOffers && allOffers.length > 0) {
      allOffers.forEach((offer: any) => {
        logger.debug("Offer", { id: offer.id, inquiryId: offer.inquiry_id, sellerId: offer.seller_id, status: offer.status })
      })
    }

    // 8. Check Meta Templates
    logger.info("Checking Meta Message Templates")
    let templates: any[] = []
    let templateError: any = null

    if (businessAccountId && accessToken) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates?fields=name,status,language&limit=50`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        )
        const data = await response.json()
        if (data.data) {
          templates = data.data
          logger.info("Fetched templates", { count: templates.length })
        } else {
          templateError = data
          logger.error("Failed to fetch templates", { error: data })
        }
      } catch (e: any) {
        templateError = e.message
        logger.error("Exception fetching templates", { error: e.message })
      }
    }

    logger.info("WhatsApp diagnostics complete")

    return NextResponse.json({
      success: true,
      message: "See console logs for full diagnostics",
      summary: {
        meta: credentials,
        templates: {
          count: templates.length,
          items: templates.map(t => `${t.name} (${t.language}) - ${t.status}`),
          error: templateError
        },
        sellers: {
          total: allSellers?.length || 0,
          verified_with_phone: verifiedSellers?.length || 0,
          phones_returned: sellerPhones.length
        },
        buyers: {
          total: allBuyers?.length || 0
        },
        inquiries: {
          count: allInquiries?.length || 0
        },
        offers: {
          count: allOffers?.length || 0
        }
      }
    })
  } catch (error: any) {
    logger.error("Diagnostics error", { error: error?.message })
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
