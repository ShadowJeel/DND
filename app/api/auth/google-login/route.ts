import { logger } from "@/lib/logger"
import { loginUserWithGoogle } from "@/lib/store"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const body = await req.json()
    const { email } = body

    if (!email) {
        return NextResponse.json({ error: "Missing email profile" }, { status: 400 })
    }

    try {
        const user = await loginUserWithGoogle(email)

        if (!user) {
            return NextResponse.json({ error: "No connected account found for this email. Please login manually and connect Google in your settings first." }, { status: 401 })
        }

        const { password: _, ...safeUser } = user

        return NextResponse.json(safeUser)
    } catch (error: any) {
        logger.error("Google Login error", { error: error?.message })
        return NextResponse.json({ error: "Login failed" }, { status: 500 })
    }
}
