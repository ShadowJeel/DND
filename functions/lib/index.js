"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateRevenueOnOfferUpdate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// Listen for updates to the 'offers' collection
exports.aggregateRevenueOnOfferUpdate = functions.firestore
    .document("offers/{offerId}")
    .onUpdate(async (change, context) => {
    var _a, _b;
    const newValue = change.after.data();
    const previousValue = change.before.data();
    // Check if the offer status just changed to 'accepted'
    if (newValue.status === "accepted" && previousValue.status !== "accepted") {
        // Attempt to extract amount or price (falling back to 0)
        const offerAmount = (_b = (_a = newValue.amount) !== null && _a !== void 0 ? _a : newValue.price) !== null && _b !== void 0 ? _b : 0;
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
//# sourceMappingURL=index.js.map