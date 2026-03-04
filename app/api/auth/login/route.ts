import { logger } from "@/lib/logger"
import { sendWelcomeMessage } from "@/lib/whatsapp"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { phone } = body

  if (!phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Send welcome/login notification WhatsApp message
  try {
    // Run in background to not block login response
    sendWelcomeMessage(phone).catch((err: any) =>
      logger.error("Failed to send login WhatsApp message", { error: err?.message })
    )
  } catch (error) {
    // Ignore sync errors
  }

  return NextResponse.json({ success: true })
}
