import { logger } from "@/lib/logger"
import { registerUser } from "@/lib/store"
// import { sendWelcomeEmail } from "@/lib/email"
// import { sendWelcomeSMS } from "@/lib/sms"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const {
    name,
    email,
    phone
  } = body

  if (!phone || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  /*
  // Send welcome Email and SMS
  try {
    if (email) await sendWelcomeEmail(email, name || "User")
    if (phone) await sendWelcomeSMS(phone, name || "User")
  } catch (notificationError) {
    logger.error("Failed to send welcome notifications", { error: (notificationError as Error)?.message })
    // Don't fail the request if notifications fail
  }
  */

  return NextResponse.json({ success: true }, { status: 201 })
}
