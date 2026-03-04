import { logger } from "@/lib/logger"
import { getUserById, updateUser, type UpdateUserData } from "@/lib/store"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Remove sensitive data
    const { password, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    logger.error("Failed to fetch user", { error: (error as Error)?.message })
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Updates are required" }, { status: 400 })
    }

    // Validate updates
    const allowedFields = ["name", "email", "phone", "company"]
    const updateData: UpdateUserData = {}

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined && value !== null) {
        updateData[key as keyof UpdateUserData] = value as string
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const updatedUser = await updateUser(userId, updateData)

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    // Remove sensitive data
    const { password, ...safeUser } = updatedUser
    return NextResponse.json({ user: safeUser, message: "Profile updated successfully" })
  } catch (error) {
    logger.error("Failed to update user", { error: (error as Error)?.message })
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
