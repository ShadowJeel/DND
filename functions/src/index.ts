import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Listen for updates to the 'offers' collection
export const aggregateRevenueOnOfferUpdate = functions.firestore
    .document("offers/{offerId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // Check if the offer status just changed to 'accepted'
        if (newValue.status === "accepted" && previousValue.status !== "accepted") {

            // Attempt to extract amount or price (falling back to 0)
            const offerAmount = newValue.amount ?? newValue.price ?? 0;

            // Calculate platform fee (e.g., 5% of the offer amount)
            const platformFee = Number(offerAmount) * 0.05;

            if (platformFee > 0) {
                // Reference to our single metadata document
                const statsRef = db.collection("platform_stats").doc("revenue_stats");

                // Use FieldValue.increment to safely add the value
                await statsRef.set({
                    total_revenue: admin.firestore.FieldValue.increment(platformFee),
                    last_updated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                console.log(`Added ₹${platformFee} to total revenue from offer ${context.params.offerId}`);
            }
        }

        return null;
    });
