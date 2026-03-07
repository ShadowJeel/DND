import { logger } from "@/lib/logger"
import { deleteOffer, getOfferById, updateOffer } from "@/lib/store"
import { NextResponse } from "next/server"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await req.json()
        const { pricePerTon, comments, pdfUrl, contactEmail, contactPhone } = body

        if (!id || !pricePerTon) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const offer = await getOfferById(id)
        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 })
        }

        if (offer.status === "accepted") {
            return NextResponse.json({ error: "Cannot edit an accepted offer" }, { status: 403 })
        }

        await updateOffer(id, {
            pricePerTon,
            comments,
            pdfUrl,
            contactEmail,
            contactPhone,
        })

        return NextResponse.json({ success: true, message: "Offer updated successfully" }, { status: 200 })
    } catch (error: any) {
        logger.error("Error updating offer", { error: error?.message })
        return NextResponse.json({ error: error.message || "Failed to update offer" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: "Offer ID required" }, { status: 400 })
        }

        const offer = await getOfferById(id)
        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 })
        }

        if (offer.status === "accepted") {
            return NextResponse.json({ error: "Cannot delete an accepted offer" }, { status: 403 })
        }

        await deleteOffer(id)

        return NextResponse.json({ success: true, message: "Offer deleted successfully" }, { status: 200 })
    } catch (error: any) {
        logger.error("Error deleting offer", { error: error?.message })
        return NextResponse.json({ error: error.message || "Failed to delete offer" }, { status: 500 })
    }
}
