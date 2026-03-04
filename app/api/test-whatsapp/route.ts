import { logger } from "@/lib/logger"
import { sendTestMessage } from "@/lib/whatsapp"
import { NextResponse } from "next/server"

// Test endpoint to verify WhatsApp integration
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneParam = searchParams.get('to')

    // Use provided phone, or fallback to env vars, or default
    const testPhone = phoneParam || process.env.TEST_PHONE_NUMBER || process.env.MY_PHONE_NUMBER || "918160911006"

    logger.info("Sending WhatsApp test message (Meta hello_world)", { to: testPhone })
    const success = await sendTestMessage(testPhone)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "WhatsApp test message sent successfully!",
        recipient: testPhone,
        testMode: process.env.WHATSAPP_TEST_MODE === "true"
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Failed to send WhatsApp message. Check server logs for details.",
        note: "Meta credentials might not be configured properly."
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error("WhatsApp test error", { error: error?.message })
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "An error occurred while testing WhatsApp integration"
    }, { status: 500 })
  }
}
