import { logger } from "@/lib/logger"
// import { sendWelcomeEmail } from "@/lib/email"
// import { sendWelcomeSMS } from "@/lib/sms"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { phone, email, name } = body

  if (!phone || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  /*
  // Send welcome/login notification Email and SMS
  try {
    // Run in background to not block login response
    if (email) sendWelcomeEmail(email, name || "User").catch((err: any) =>
      logger.error("Failed to send login Email", { error: err?.message })
    )
    if (phone) sendWelcomeSMS(phone, name || "User").catch((err: any) =>
      logger.error("Failed to send login SMS", { error: err?.message })
    )
  } catch (error) {
    // Ignore sync errors
  }
  */

  return NextResponse.json({ success: true })
}
