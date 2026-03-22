import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { logger } from "@/lib/logger"

export async function GET() {
    try {
        const snap = await getDocs(collection(db, "locations"))
        const locations = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Optional: Sort states alphabetically just in case
        locations.sort((a: any, b: any) => (a.state_name || "").localeCompare(b.state_name || ""))

        return NextResponse.json(locations)
    } catch (error: any) {
        logger.error("Error fetching locations", { error: error?.message })
        return NextResponse.json({ error: error.message || "Failed to fetch locations" }, { status: 500 })
    }
}
