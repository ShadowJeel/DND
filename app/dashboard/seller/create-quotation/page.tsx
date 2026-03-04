"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart } from "lucide-react"

export default function CreateQuotationPage() {
    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-8">
                <h2 className="font-serif text-2xl font-bold text-foreground">Create Quotation</h2>
                <p className="mt-1 text-muted-foreground">
                    Select an inquiry to create a new quotation.
                </p>
            </div>

            <Card className="border-border">
                <CardContent className="flex flex-col items-center gap-3 py-16">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Select an inquiry from the "New Bidding Inquiries" page to start a quotation.</p>
                </CardContent>
            </Card>
        </div>
    )
}
