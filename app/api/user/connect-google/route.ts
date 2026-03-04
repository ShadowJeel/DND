import { logger } from "@/lib/logger"
import { connectUserWithGoogle } from "@/lib/store"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const body = await req.json()
    const { userId, email } = body

    if (!userId || !email) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    try {
        const success = await connectUserWithGoogle(userId, email)

        if (!success) {
            return NextResponse.json({ error: "Failed to connect Google account. Details didn't match." }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        logger.error("Google Connect error", { error: error?.message })
        return NextResponse.json({ error: "Connection failed" }, { status: 500 })
    }
}
