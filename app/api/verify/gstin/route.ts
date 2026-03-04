import { NextResponse } from "next/server"

// GSTIN format: 2 digit state code + 10 char PAN + 1 entity number + Z + checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export async function POST(req: Request) {
  const body = await req.json()
  const { gstin } = body

  if (!gstin) {
    return NextResponse.json(
      { valid: false, message: "GSTIN is required" },
      { status: 400 },
    )
  }

  const cleaned = gstin.toUpperCase().trim()

  // Step 1: Format validation
  if (!GSTIN_REGEX.test(cleaned)) {
    return NextResponse.json(
      {
        valid: false,
        message:
          "Invalid GSTIN format. Must be 15 characters (e.g. 27AAPFU0939F1ZV)",
      },
      { status: 400 },
    )
  }

  /* 
  // Step 2: Try external verification via government GST API
  // TEMPORARILY DISABLED: User reported issues with the free API endpoint.
  // Re-enable if a stable API key/endpoint is available.
  try {
    // Use the public GST search portal endpoint (no API key required)
    const res = await fetch(
      `https://sheet.gstincheck.co.in/check/free/${cleaned}`,
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    )

    if (res.ok) {
      const data = await res.json()

      if (data.flag === true && data.data) {
        return NextResponse.json({
          valid: true,
          message: "GSTIN verified successfully",
          details: {
            gstin: data.data.gstin || cleaned,
            legalName: data.data.lgnm || "",
            tradeName: data.data.tradeNam || "",
            status: data.data.sts || "",
            stateCode: data.data.stj || "",
            registrationDate: data.data.rgdt || "",
            type: data.data.dty || "",
            lastUpdated: data.data.lstupdt || "",
          },
        })
      }

      if (data.flag === false) {
        return NextResponse.json(
          {
            valid: false,
            message:
              data.message || "GSTIN not found in government records",
          },
          { status: 400 },
        )
      }
    }
  } catch {
    // External API unavailable, fall back to format-only validation
  }
  */

  // Fallback: format is valid but couldn't verify with external API
  return NextResponse.json({
    valid: true,
    message:
      "GSTIN format is valid. External verification is temporarily unavailable.",
    details: {
      gstin: cleaned,
      legalName: "",
      tradeName: "",
      status: "Format Valid (external check unavailable)",
      stateCode: cleaned.substring(0, 2),
      registrationDate: "",
      type: "",
      lastUpdated: "",
    },
  })
}
