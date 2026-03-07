import { logger } from "./logger"

const TEST_MODE = process.env.SMS_TEST_MODE === "true"

// MSG91 configuration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || ""
const MSG91_API_URL = "https://control.msg91.com/api/v5/flow/"

interface MSG91Payload {
    template_id: string;
    recipients: Array<{
        mobiles: string;
        [key: string]: string; // for dynamic variables in MSG91 templates
    }>;
}

/**
 * MSG91 SMS sender using Flow Builder API
 */
export async function sendSMS(payload: MSG91Payload) {
    if (TEST_MODE) {
        logger.info("Test mode enabled; skipping actual SMS send", { payload })
        return { success: true, messageId: "test-mode-sms-" + Date.now() }
    }

    if (!MSG91_AUTH_KEY) {
        logger.warn("MSG91_AUTH_KEY not configured. Simulating SMS send.", { payload })
        return { success: true, simulated: true }
    }

    try {
        // MSG91 expects mobile numbers typically without '+' but with country code (e.g., 919876543210)
        const sanitizedPayload = {
            ...payload,
            recipients: payload.recipients.map(recipient => {
                // Ensure mobiles is a string and strip non-digit characters
                const cleanMobile = recipient.mobiles.replace(/\D/g, "");
                return {
                    ...recipient,
                    mobiles: cleanMobile
                }
            })
        }

        const response = await fetch(MSG91_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // MSG91 uses 'authkey' header
                authkey: MSG91_AUTH_KEY,
            },
            body: JSON.stringify(sanitizedPayload),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`MSG91 Error: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        logger.info("SMS sent successfully via MSG91", { data })
        return { success: true, data }
    } catch (error) {
        logger.error("Failed to send SMS via MSG91", { error: (error as Error).message, payload })
        throw error
    }
}

// ----------------------------------------------------------------------------
// Specific Application SMS Messages
// ----------------------------------------------------------------------------

export async function sendWelcomeSMS(to: string, name: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_WELCOME || "SIMULATED",
        recipients: [{ mobiles: to, name }] // Maps to {#name#} in template
    })
}

export async function notifySellerOfNewInquirySMS(to: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_NEW_INQUIRY || "SIMULATED",
        recipients: [{ mobiles: to }]
    })
}

export async function notifySellersOfBiddingSMS(to: string, inquiryId: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_BIDDING_STARTED || "SIMULATED",
        recipients: [{ mobiles: to, inquiryId }] // Maps to {#inquiryId#} in template
    })
}

export async function notifyBuyerOfNewOfferSMS(to: string, inquiryId: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_NEW_OFFER || "SIMULATED",
        recipients: [{ mobiles: to, inquiryId }] // Maps to {#inquiryId#} in template
    })
}

export async function notifyBuyerOfAcceptanceSMS(to: string, offerId: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_OFFER_ACCEPTED_BUYER || "SIMULATED",
        recipients: [{ mobiles: to, offerId }] // Maps to {#offerId#} in template
    })
}

export async function notifySellerOfAcceptanceSMS(to: string, offerId: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_OFFER_ACCEPTED_SELLER || "SIMULATED",
        recipients: [{ mobiles: to, offerId }] // Maps to {#offerId#} in template
    })
}

export async function notifySellerOfRejectionSMS(to: string, offerId: string) {
    return sendSMS({
        template_id: process.env.MSG91_TEMPLATE_OFFER_REJECTED_SELLER || "SIMULATED",
        recipients: [{ mobiles: to, offerId }] // Maps to {#offerId#} in template
    })
}
