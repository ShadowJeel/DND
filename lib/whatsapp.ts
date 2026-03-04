// WhatsApp messaging using Meta WhatsApp Cloud API
import { logger } from "@/lib/logger"

const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
const accountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID
const testMode = process.env.WHATSAPP_TEST_MODE === "true"
const testPhoneNumber = process.env.TEST_PHONE_NUMBER

// Types for Meta API
type TemplateComponent = {
  type: "body" | "header" | "footer" | "button"
  parameters: any[]
}

type TemplateLang = {
  code: string
}

type TemplateMessage = {
  name: string
  language: TemplateLang
  components?: TemplateComponent[]
}

async function sendMetaMessage(to: string, template: TemplateMessage): Promise<boolean> {
  if (!accessToken || !phoneNumberId) {
    logger.error("Meta WhatsApp credentials missing", {
      accessToken: accessToken ? "SET" : "NOT_SET",
      phoneNumberId: phoneNumberId ? "SET" : "NOT_SET",
    })
    return false
  }

  try {
    // Validate phone number
    if (!to || to.trim() === "") {
      logger.error("Invalid phone number: empty")
      return false
    }

    // In test mode, override recipient with test phone number
    let finalRecipient = to
    if (testMode && testPhoneNumber) {
      logger.info("Test mode enabled; redirecting WhatsApp message", { from: to, to: testPhoneNumber })
      finalRecipient = testPhoneNumber
    }

    // Normalize number to E.164-like format (strip spaces and symbols, ensure country code)
    // Meta requires country code without (+)
    let cleanNumber = finalRecipient.replace(/\D/g, "")
    if (cleanNumber.length === 10) {
      cleanNumber = "91" + cleanNumber // Default to India if 10 digits
    }

    logger.info("Sending Meta WhatsApp message", { to: cleanNumber, template: template.name })

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanNumber,
          type: "template",
          template: template,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      logger.error("Meta API error", { error: data })
      return false
    }

    logger.info("WhatsApp message sent via Meta", { messageId: data.messages?.[0]?.id })
    return true
  } catch (error: any) {
    logger.error("Exception sending Meta WhatsApp message", { error: error?.message })
    return false
  }
}

export async function notifySellerOfAcceptance(
  sellerPhone: string,
  inquiryId: string,
  buyerName: string,
  buyerContact: string
): Promise<boolean> {
  return sendMetaMessage(sellerPhone, {
    name: "offer_accepted_seller",
    language: { code: "en" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: inquiryId },
          { type: "text", text: buyerName },
          { type: "text", text: buyerContact },
        ],
      },
    ],
  })
}

export async function notifyBuyerOfAcceptance(
  buyerPhone: string,
  inquiryId: string,
  sellerName: string,
  sellerContact: string
): Promise<boolean> {
  return sendMetaMessage(buyerPhone, {
    name: "offer_accepted_buyer",
    language: { code: "en_US" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: inquiryId },
          { type: "text", text: sellerName },
          { type: "text", text: sellerContact },
        ],
      },
    ],
  })
}

export async function notifySellerOfNewInquiry(
  sellerPhone: string,
  inquiryId: string,
  items: string
): Promise<boolean> {
  // Truncate items if too long for template param
  const truncatedItems = items.length > 60 ? items.substring(0, 57) + "..." : items

  return sendMetaMessage(sellerPhone, {
    name: "new_inquiry_alert",
    language: { code: "en" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: inquiryId },
          { type: "text", text: truncatedItems },
        ],
      },
    ],
  })
}

export async function notifyBuyerOfNewOffer(
  buyerPhone: string,
  inquiryId: string,
  pricePerTon: number
): Promise<boolean> {
  return sendMetaMessage(buyerPhone, {
    name: "new_offer_alert",
    language: { code: "en" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: inquiryId },
          { type: "text", text: pricePerTon.toString() },
        ],
      },
    ],
  })
}


export async function notifySellerOfRejection(
  sellerPhone: string,
  inquiryId: string
): Promise<boolean> {
  return sendMetaMessage(sellerPhone, {
    name: "offer_rejected",
    language: { code: "en_US" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: inquiryId },
        ],
      },
    ],
  })
}

export async function notifySellersOfBidding(
  sellerPhones: string[],
  inquiryId: string,
  deadline: Date,
  items: string
): Promise<void> {
  const deadlineStr = deadline.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const timeRemaining = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  // Truncate items if too long
  const truncatedItems = items.length > 60 ? items.substring(0, 57) + "..." : items

  const promises = sellerPhones.map((phone) =>
    sendMetaMessage(phone, {
      name: "bidding_started",
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: inquiryId },
            { type: "text", text: truncatedItems },
            { type: "text", text: deadlineStr },
            { type: "text", text: timeRemaining.toString() },
          ],
        },
      ],
    })
  )

  await Promise.allSettled(promises)
}

export async function sendTestMessage(to: string): Promise<boolean> {
  // Uses the standard hello_world template provided by Meta
  return sendMetaMessage(to, {
    name: "hello_world",
    language: { code: "en_US" },
  })
}

export async function sendWelcomeMessage(to: string): Promise<boolean> {
  return sendMetaMessage(to, {
    name: "hello_world",
    language: { code: "en_US" },
  })
}


