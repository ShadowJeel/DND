import nodemailer from "nodemailer"
import { logger } from "./logger"

// Ensure we have correct SMTP config in a real app,
// but handle missing ones gracefully during development.
const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER || "test@example.com",
        pass: process.env.SMTP_PASS || "password",
    },
}

const transporter = nodemailer.createTransport(smtpConfig)

const TEST_MODE = process.env.EMAIL_TEST_MODE === "true"

/**
 * Generic email sender using SMTP
 */
export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) {
    if (TEST_MODE) {
        logger.info("Test mode enabled; skipping actual email send", { to, subject })
        return { success: true, messageId: "test-mode-email-" + Date.now() }
    }

    try {
        const info = await transporter.sendMail({
            from: `"DND App" <${process.env.SMTP_FROM || smtpConfig.auth.user}>`,
            to,
            subject,
            html,
        })

        logger.info("Email sent successfully", { to, messageId: info.messageId })
        return { success: true, messageId: info.messageId }
    } catch (error) {
        logger.error("Failed to send email", { error: (error as Error).message, to })
        throw error
    }
}

// ----------------------------------------------------------------------------
// Specific Application Emails
// ----------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, name: string) {
    const subject = "Welcome to DND App!"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Hello ${name},</h2>
      <p>Welcome to our platform! We're excited to have you on board.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfNewInquiryEmail(to: string) {
    const subject = "New Inquiry Alert"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>New Inquiry Alert</h2>
      <p>A new inquiry has been posted that matches your categories.</p>
      <p>Log in to your dashboard to view the details and submit an offer.</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellersOfBiddingEmail(to: string, inquiryId: string) {
    const subject = "Bidding Initiated for Draft Inquiry"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Bidding Started</h2>
      <p>The buyer has finalized Draft Inquiry #${inquiryId} and bidding has started.</p>
      <p>Log in to submit or update your offers before the timer ends!</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifyBuyerOfNewOfferEmail(to: string, inquiryId: string) {
    const subject = "New Offer Received"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>New Offer!</h2>
      <p>You have received a new offer on Inquiry #${inquiryId}.</p>
      <p>Log in to review all current offers.</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifyBuyerOfAcceptanceEmail(to: string, offerId: string) {
    const subject = "Offer Accepted Successfully"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Offer Accepted</h2>
      <p>You have successfully accepted Offer #${offerId}.</p>
      <p>The seller has been notified and you can now communicate directly to finalize the details.</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfAcceptanceEmail(to: string, offerId: string) {
    const subject = "Congratulations! Your Offer was Accepted"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Offer Accepted!</h2>
      <p>Congratulations! Your Offer #${offerId} has been accepted by the buyer.</p>
      <p>Log in to view the buyer's contact details and proceed with the order.</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfRejectionEmail(to: string, offerId: string) {
    const subject = "Offer Update"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Offer Status Update</h2>
      <p>Your Offer #${offerId} was not accepted this time.</p>
      <p>Thank you for participating! Check out other active inquiries in your dashboard.</p>
      <p>Best regards,<br/>The DND Team</p>
    </div>
  `
    return sendEmail({ to, subject, html })
}
