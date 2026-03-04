import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { logger } from "@/lib/logger"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const productName = searchParams.get("productName")

        if (!productName) {
            return NextResponse.json({ error: "productName required" }, { status: 400 })
        }

        // First get the product ID
        const productQuery = query(collection(db, "products"), where("name", "==", productName), limit(1))
        const productSnap = await getDocs(productQuery)

        if (productSnap.empty) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        const productDoc = productSnap.docs[0]
        const productId = productDoc.data().product_id;

        // Then get its options
        const optionsQuery = query(collection(db, "product_options"), where("product_id", "==", productId))
        const optionsSnap = await getDocs(optionsQuery)

        const optionsData = optionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        return NextResponse.json(optionsData)
    } catch (error: any) {
        logger.error("Error fetching product options", { error: error?.message })
        return NextResponse.json({ error: error.message || "Failed to fetch product options" }, { status: 500 })
    }
}
