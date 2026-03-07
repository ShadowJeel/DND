"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSellerDeleted = exports.onBuyerDeleted = exports.aggregateRevenueOnOfferUpdate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// Listen for updates to the 'offers' collection
exports.aggregateRevenueOnOfferUpdate = functions.firestore
    .database("sdnds")
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
// Delete Firebase Auth user when their buyer document is deleted
exports.onBuyerDeleted = functions.firestore
    .database("sdnds")
    .document("buyers/{buyerId}")
    .onDelete(async (snap, context) => {
    const buyerId = context.params.buyerId;
    try {
        await admin.auth().getUser(buyerId);
        await admin.auth().deleteUser(buyerId);
        console.log(`Successfully deleted Firebase Auth user for buyer: ${buyerId}`);
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`Firebase Auth user for buyer ${buyerId} already deleted or not found.`);
        }
        else {
            console.error(`Error deleting Firebase Auth user for buyer ${buyerId}:`, error);
        }
    }
    return null;
});
// Delete Firebase Auth user when their seller document is deleted
exports.onSellerDeleted = functions.firestore
    .database("sdnds")
    .document("sellers/{sellerId}")
    .onDelete(async (snap, context) => {
    const sellerId = context.params.sellerId;
    try {
        await admin.auth().getUser(sellerId);
        await admin.auth().deleteUser(sellerId);
        console.log(`Successfully deleted Firebase Auth user for seller: ${sellerId}`);
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`Firebase Auth user for seller ${sellerId} already deleted or not found.`);
        }
        else {
            console.error(`Error deleting Firebase Auth user for seller ${sellerId}:`, error);
        }
    }
    return null;
});
//# sourceMappingURL=index.js.map