import { logger } from "@/lib/logger"
import { registerUser } from "@/lib/store"
import { sendWelcomeMessage } from "@/lib/whatsapp"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const {
    name,
    email,
    phone
  } = body

  if (!phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Send welcome WhatsApp message
  try {
    await sendWelcomeMessage(phone)
  } catch (whatsappError) {
    logger.error("Failed to send welcome WhatsApp message", { error: (whatsappError as Error)?.message })
    // Don't fail the request if WhatsApp fails
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
