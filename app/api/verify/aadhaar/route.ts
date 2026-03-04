import { NextResponse } from "next/server"
import { validateAadhaar } from "@/lib/aadhaar-verhoeff"

export async function POST(req: Request) {
  const body = await req.json()
  const { aadhaarNumber } = body

  if (!aadhaarNumber) {
    return NextResponse.json(
      { valid: false, message: "Aadhaar number is required" },
      { status: 400 },
    )
  }

  const result = validateAadhaar(aadhaarNumber)

  if (!result.valid) {
    return NextResponse.json(result, { status: 400 })
  }

  // In a production environment, you would call the UIDAI
  // e-KYC / Authentication API here after OTP consent.
  // UIDAI APIs require KUA/AUA licensing.
  // For now we validate format + Verhoeff checksum (same as UIDAI).

  return NextResponse.json({
    valid: true,
    message: "Aadhaar number verified successfully (Verhoeff checksum passed)",
    masked: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
  })
}
