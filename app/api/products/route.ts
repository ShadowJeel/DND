import { NextResponse } from "next/server"
import { getProducts } from "@/lib/store"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const products = await getProducts()
        return NextResponse.json(products)
    } catch (error: any) {
        logger.error("Error fetching products", { error: error?.message })
        return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 })
    }
}
