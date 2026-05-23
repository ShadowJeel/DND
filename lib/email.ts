import nodemailer from "nodemailer"
import { logger } from "./logger"

// Configuration
const SMTP_USER = process.env.SMTP_USER || "contact@dndpurchase.com"
const SMTP_PASS = process.env.SMTP_PASS || "gukl slbv piec fiao"
const envFrom = process.env.EMAIL_FROM_ADDRESS || SMTP_USER
const EMAIL_FROM_ADDRESS = envFrom.includes('<') ? envFrom : `"DND Purchase" <${envFrom}>`
const TEST_MODE = process.env.EMAIL_TEST_MODE === "true"

// Google Workspace SMTP Configuration
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
})

/**
 * Generic email sender using Google Workspace SMTP
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

    if (!SMTP_USER || !SMTP_PASS) {
        logger.error("SMTP_USER or SMTP_PASS not configured. Cannot send email.", { to, subject })
        throw new Error("SMTP credentials are missing. Please configure them to send emails in production.")
    }

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM_ADDRESS,
            to,
            subject,
            html,
        })

        logger.info("Email sent successfully via Google Workspace", { to, messageId: info.messageId })
        return { success: true, messageId: info.messageId }
    } catch (error) {
        logger.error("Failed to send email via Google Workspace", { error: (error as Error).message, to })
        throw error
    }
}

// ----------------------------------------------------------------------------
// Specific Application Emails
// ----------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, name: string) {
    const subject = "Welcome to DND Purchase!"
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Hello ${name},</h2>
      <p>Welcome to our platform! We're excited to have you on board. Now you can Buy/Sell 'Steel' & 'Cement' products in just '2-step' process</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="https://www.dndpurchase.com/logo-asset-4.png" alt="DND Purchase Logo" style="max-width: 150px; height: auto; display: block; margin-top: 12px;" />
      </p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfNewInquiryEmail(to: string, inquiryId: string, productName: string) {
    const subject = `New Inquiry Alert: ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>New Inquiry Alert</h2>
      <p>A new inquiry (#${inquiryId}) for <strong>${productName}</strong> has been posted that matches your categories.</p>
      <p>Log in to your dashboard to view the details and submit an offer.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>
          </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellersOfBiddingEmail(to: string, inquiryId: string, productName: string) {
    const subject = `Bidding Initiated for ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Bidding Started</h2>
      <p>The buyer has finalized Draft Inquiry #${inquiryId} for <strong>${productName}</strong> and bidding has started.</p>
      <p>Log in to submit or update your offers before the timer ends!</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifyBuyerOfNewOfferEmail(to: string, inquiryId: string, productName: string, offerCount: number) {
    const shouldSend = offerCount === 1 || offerCount === 3 || offerCount === 5 || (offerCount >= 10 && offerCount % 10 === 0);
    if (!shouldSend) {
        return { success: true, skipped: true };
    }

    const subject = `New Offers Received on ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Offer Milestone Reached!</h2>
      <p>Your Inquiry #${inquiryId} for <strong>${productName}</strong> has now received <strong>${offerCount} offers</strong>.</p>
      <p>Log in to review all current offers.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifyBuyerOfAcceptanceEmail(
    to: string, 
    offerId: string, 
    inquiryId: string, 
    productName: string,
    sellerInfo: { name: string; company?: string; email: string; phone: string }
) {
    const subject = `Offer Accepted Successfully for ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #1a1a1a; padding: 20px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-weight: normal;">Offer Accepted</h2>
        <p style="margin: 8px 0 0 0; color: #cccccc; font-size: 14px;">Inquiry Reference: #${inquiryId} | Offer Reference: #${offerId}</p>
      </div>
      <div style="padding: 24px;">
        <p>You have successfully accepted the offer on Inquiry #${inquiryId} for <strong>${productName}</strong>.</p>
        
        <h3 style="color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; margin-top: 24px;">Seller Contact Information</h3>
        <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; border: 1px solid #eee; margin-top: 12px;">
          <p style="margin: 6px 0;"><strong>Name:</strong> ${sellerInfo.name}</p>
          ${sellerInfo.company ? `<p style="margin: 6px 0;"><strong>Company:</strong> ${sellerInfo.company}</p>` : ""}
          <p style="margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${sellerInfo.email}" style="color: #0066cc;">${sellerInfo.email}</a></p>
          <p style="margin: 6px 0;"><strong>Phone:</strong> <a href="tel:${sellerInfo.phone}" style="color: #0066cc;">${sellerInfo.phone}</a></p>
        </div>
        
        <p style="margin-top: 24px;">You can now communicate directly with the seller to finalize shipment, payment, and delivery details.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>      </div>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfAcceptanceEmail(
    to: string, 
    offerId: string, 
    inquiryId: string, 
    productName: string,
    buyerInfo: { name: string; company?: string; email: string; phone: string }
) {
    const subject = `Congratulations! Your Offer for ${productName} was Accepted`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #1a1a1a; padding: 20px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-weight: normal;">Congratulations! Offer Accepted</h2>
        <p style="margin: 8px 0 0 0; color: #cccccc; font-size: 14px;">Inquiry Reference: #${inquiryId} | Offer Reference: #${offerId}</p>
      </div>
      <div style="padding: 24px;">
        <p>Congratulations! Your Offer #${offerId} on Inquiry #${inquiryId} for <strong>${productName}</strong> has been accepted by the buyer.</p>
        
        <h3 style="color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; margin-top: 24px;">Buyer Contact Information</h3>
        <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; border: 1px solid #eee; margin-top: 12px;">
          <p style="margin: 6px 0;"><strong>Name:</strong> ${buyerInfo.name}</p>
          ${buyerInfo.company ? `<p style="margin: 6px 0;"><strong>Company:</strong> ${buyerInfo.company}</p>` : ""}
          <p style="margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${buyerInfo.email}" style="color: #0066cc;">${buyerInfo.email}</a></p>
          <p style="margin: 6px 0;"><strong>Phone:</strong> <a href="tel:${buyerInfo.phone}" style="color: #0066cc;">${buyerInfo.phone}</a></p>
        </div>
        
        <p style="margin-top: 24px;">Please connect with the buyer directly to arrange the delivery and billing details for the order.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>      </div>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function sendInquirySubmissionReceiptEmail(to: string, inquiry: any) {
    const subject = `Inquiry Submission Receipt: #${inquiry.id}`
    
    // Construct items list/table
    const itemsHtml = inquiry.items.map((item: any, idx: number) => {
        const optionsHtml = item.options ? Object.entries(item.options).map(([k, v]) => {
            const valStr = Array.isArray(v) ? v.join(", ") : String(v);
            return `<li><strong>${k}:</strong> ${valStr}</li>`;
        }).join("") : "";

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold; color: #111; font-size: 14px;">${idx + 1}</td>
                <td style="padding: 12px; color: #333; font-size: 14px;">
                    <strong>${item.product}</strong>
                    ${item.sub_product ? `<br/><span style="color: #666; font-size: 12px;">Sub-product: ${item.sub_product}</span>` : ""}
                </td>
                <td style="padding: 12px; color: #555; font-size: 13px;">
                    ${optionsHtml ? `<ul style="margin: 0; padding-left: 16px;">${optionsHtml}</ul>` : "None"}
                </td>
                <td style="padding: 12px; color: #666; font-size: 13px; font-style: italic;">${item.remarks || "None"}</td>
            </tr>
        `;
    }).join("");

    const deliveryHtml = `
        <p style="margin: 4px 0; font-size: 14px;"><strong>District:</strong> ${inquiry.district || "N/A"}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>State:</strong> ${inquiry.state || "N/A"}</p>
            `;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #1a1a1a; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">Inquiry Submitted Successfully</h2>
        <p style="margin: 8px 0 0 0; color: #cccccc; font-size: 14px;">Inquiry Reference: #${inquiry.id}</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear ${inquiry.buyerName || "Buyer"},</p>
        <p>Your inquiry has been successfully submitted. Below are the details of your submission:</p>
        
        <h3 style="color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; margin-top: 24px;">Inquiry Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
                <tr style="background-color: #f7f7f7; text-align: left; border-bottom: 2px solid #ddd;">
                    <th style="padding: 12px; font-size: 13px; text-transform: uppercase; color: #555;">#</th>
                    <th style="padding: 12px; font-size: 13px; text-transform: uppercase; color: #555;">Product</th>
                    <th style="padding: 12px; font-size: 13px; text-transform: uppercase; color: #555;">Specifications</th>
                    <th style="padding: 12px; font-size: 13px; text-transform: uppercase; color: #555;">Remarks</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; border: 1px solid #eee;">
                <h4 style="margin: 0 0 8px 0; color: #1a1a1a;">Delivery Information</h4>
                ${deliveryHtml}
            </div>
            ${inquiry.biddingDeadline ? `
            <div style="background-color: #f9f9f9; padding: 16px; border-radius: 6px; border: 1px solid #eee;">
                <h4 style="margin: 0 0 8px 0; color: #1a1a1a;">Bidding Details</h4>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Bidding Deadline:</strong> ${new Date(inquiry.biddingDeadline).toLocaleString()}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> Bidding Active</p>
            </div>
            ` : ""}
        </div>

        <p style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; font-size: 13px; color: #888; text-align: center;">
            Thank you for utilizing DND Purchase.<br/>
            You will receive updates when sellers submit offers.
        </p>
      </div>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfRejectionEmail(to: string, offerId: string, inquiryId: string, productName: string) {
    const subject = `Offer Update for ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Offer Status Update</h2>
      <p>Your Offer #${offerId} on Inquiry #${inquiryId} for <strong>${productName}</strong> was not accepted this time.</p>
      <p>Thank you for participating! Check out other active inquiries in your dashboard.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifyBuyerOfInquiryClosedEmail(to: string, inquiryId: string, productName: string) {
    const subject = `Inquiry Closed: ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Inquiry Closed</h2>
      <p>Your Inquiry #${inquiryId} for <strong>${productName}</strong> has been closed.</p>
      <p>Thank you for using DND.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfInquiryClosedEmail(to: string, inquiryId: string, productName: string) {
    const subject = `Inquiry Closed: ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Inquiry Update</h2>
      <p>The Inquiry #${inquiryId} for <strong>${productName}</strong> has been closed by the buyer or system.</p>
      <p>Any pending offers for this inquiry will no longer be considered.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="Asset 4.png" alt="Asset 4" style="max-width: 100%; height: auto; display: block; margin-top: 12px;" />
      </p>    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifyBuyerOfInquiryDeletedEmail(to: string, inquiryId: string, productName: string) {
    const subject = `Inquiry Cancelled: ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Inquiry Cancelled</h2>
      <p>Your Inquiry #${inquiryId} for <strong>${productName}</strong> has been successfully cancelled/deleted.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="https://www.dndpurchase.com/logo-asset-4.png" alt="DND Purchase Logo" style="max-width: 150px; height: auto; display: block; margin-top: 12px;" />
      </p>
    </div>
  `
    return sendEmail({ to, subject, html })
}

export async function notifySellerOfInquiryDeletedEmail(to: string, inquiryId: string, productName: string) {
    const subject = `Inquiry Cancelled: ${productName}`
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Inquiry Update</h2>
      <p>The Inquiry #${inquiryId} for <strong>${productName}</strong> has been cancelled/deleted by the buyer.</p>
      <p>Any pending offers for this inquiry will no longer be considered.</p>
      <p>Best Regards,<br/>DND Purchase Team <br>www.dndpurchase.com  <br>
        <img src="https://www.dndpurchase.com/logo-asset-4.png" alt="DND Purchase Logo" style="max-width: 150px; height: auto; display: block; margin-top: 12px;" />
      </p>
    </div>
  `
    return sendEmail({ to, subject, html })
}
