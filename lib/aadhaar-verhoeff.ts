// Verhoeff Algorithm for Aadhaar validation
// This is the same algorithm used by UIDAI (Government of India)
// to validate the checksum digit of a 12-digit Aadhaar number.

// Multiplication table
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

// Permutation table
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

/**
 * Validates an Aadhaar number using the Verhoeff checksum algorithm.
 * This is the official algorithm used by UIDAI (Government of India).
 *
 * @param aadhaar - The 12-digit Aadhaar number as a string
 * @returns Object with valid flag and message
 */
export function validateAadhaar(aadhaar: string): {
  valid: boolean
  message: string
} {
  // Remove spaces and hyphens
  const cleaned = aadhaar.replace(/[\s-]/g, "")

  // Check if it's exactly 12 digits
  if (!/^\d{12}$/.test(cleaned)) {
    return {
      valid: false,
      message: "Aadhaar number must be exactly 12 digits",
    }
  }

  // Aadhaar cannot start with 0 or 1
  if (cleaned[0] === "0" || cleaned[0] === "1") {
    return {
      valid: false,
      message: "Aadhaar number cannot start with 0 or 1",
    }
  }

  // Verhoeff checksum validation
  let c = 0
  const digits = cleaned.split("").map(Number).reverse()
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]]
  }

  if (c !== 0) {
    return {
      valid: false,
      message: "Invalid Aadhaar number. Checksum verification failed.",
    }
  }

  return {
    valid: true,
    message: "Aadhaar number is valid (Verhoeff checksum passed)",
  }
}
