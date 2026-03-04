import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { logger } from "@/lib/logger"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const documentType = formData.get("documentType") as string // 'aadhaar' or 'gstin'
    const userName = formData.get("userName") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!documentType || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024 // 2MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 2MB limit" }, { status: 400 })
    }

    // Validate file type (Images only: jpeg, jpg, png)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only image files (JPEG, JPG, PNG) are allowed" }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename with proper extension
    const timestamp = Date.now()
    const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, "_")
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${sanitizedUserName}_${timestamp}.${fileExtension}`

    // Upload to Firebase Storage
    const storageRef = ref(storage, `documents/${fileName}`)
    const snapshot = await uploadBytes(storageRef, bytes)
    const downloadURL = await getDownloadURL(snapshot.ref)

    return NextResponse.json(
      {
        success: true,
        url: downloadURL,
        filePath: downloadURL, // For backward compatibility with frontend
        publicId: fileName,
        fileName: fileName,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error("File upload error", { error: (error as Error)?.message })
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
