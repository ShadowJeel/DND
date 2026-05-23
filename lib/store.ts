import { db, auth } from "./firebase"
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, getCountFromServer, or } from "firebase/firestore"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { logger } from "./logger"

export type UserRole = "buyer" | "seller" | "both"
export type VerificationType = "gst" | "aadhar"
export type EntityType = "company" | "individual"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  password: string
  company?: string
  role: UserRole
  entityType: EntityType
  verificationType: VerificationType
  gstin?: string
  gstCertificatePath?: string
  aadhaarNumber?: string
  aadhaarDocumentPath?: string
  displayName: string
  userCode: string
  verified: boolean
  googleConnected: boolean
  createdAt: string
  categories?: string[]
  productManufacturers?: Record<string, string[]>
  sellerProductOptions?: Record<string, any[]>
  availableLocations?: Record<string, string[]>
  smsNotificationsEnabled: boolean
  secondaryEmails?: string[]
  notificationEmails?: string[]
  verifiedSecondaryEmails?: string[]
}

export interface InquiryItem {
  id: string
  product: string
  sub_product?: string
  paymentTerms: string
  options?: Record<string, string | string[]>
  remarks?: string
}

export interface Inquiry {
  id: string
  buyerId: string
  buyerName?: string
  buyerAlias: string
  items: InquiryItem[]
  status: "active" | "open" | "bidding" | "closed" | "deleted"
  biddingDeadline?: string
  createdAt: string
  deliveryAddress?: string
  district?: string
  state?: string
  pinCode?: string
  rebidCount?: number
  offersCount?: number
}

export interface Offer {
  id: string
  inquiryId: string
  inquiryItemId: string
  sellerId: string
  sellerName?: string
  sellerAlias?: string
  anonymizedSeller?: string
  pricePerTon: number
  comments: string
  pdfUrl?: string
  attachments?: string[]
  contactEmail?: string
  contactPhone?: string
  status: "pending" | "accepted" | "rejected" | "disqualified" | "deleted"
  rank?: number
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  sellerOptions?: Record<string, string | string[]>
  requestedQuantity?: number
  createdAt: string
  updatedAt: string
  archived?: boolean
  inquiryStatus?: string
}

function mapBuyerFromDb(row: any, id: string): User {
  return {
    id: row.id || id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password,
    company: row.company,
    role: "buyer",
    entityType: row.entity_type,
    verificationType: row.entity_type === "company" ? "gst" : "aadhar",
    aadhaarNumber: row.aadhaar_number,
    aadhaarDocumentPath: row.aadhaar_document_path,
    gstin: row.gstin,
    gstCertificatePath: row.gst_certificate_path,
    displayName: row.display_name,
    userCode: row.user_code || row.display_name,
    verified: Boolean(row.verified),
    googleConnected: Boolean(row.google_connected),
    createdAt: row.created_at,
    smsNotificationsEnabled: row.sms_notifications_enabled !== false, // default to true
    secondaryEmails: row.secondary_emails || [],
    notificationEmails: (row.notification_emails && row.notification_emails.length > 0) ? row.notification_emails : [row.email],
    verifiedSecondaryEmails: row.verified_secondary_emails || [],
  }
}

function mapSellerFromDb(row: any, id: string): User {
  const fallbackOptions: Record<string, Record<string, any>> = {};
  if (!row.seller_product_options && row.product_manufacturers) {
    Object.entries(row.product_manufacturers).forEach(([prod, mfgs]) => {
      fallbackOptions[prod] = { "Manufacturer": mfgs }
    })
  }

  return {
    id: row.id || id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password,
    company: row.company,
    role: "seller",
    entityType: row.entity_type,
    verificationType: row.entity_type === "company" ? "gst" : "aadhar",
    gstin: row.gstin,
    gstCertificatePath: row.gst_certificate_path,
    aadhaarNumber: row.aadhaar_number,
    aadhaarDocumentPath: row.aadhaar_document_path,
    displayName: row.display_name,
    userCode: row.user_code || row.display_name,
    verified: Boolean(row.verified),
    googleConnected: Boolean(row.google_connected),
    createdAt: row.created_at,
    categories: row.categories || [],
    productManufacturers: row.product_manufacturers || {},
    sellerProductOptions: row.seller_product_options || fallbackOptions,
    availableLocations: row.available_locations || {},
    smsNotificationsEnabled: row.sms_notifications_enabled !== false, // default to true
    secondaryEmails: row.secondary_emails || [],
    notificationEmails: (row.notification_emails && row.notification_emails.length > 0) ? row.notification_emails : [row.email],
    verifiedSecondaryEmails: row.verified_secondary_emails || [],
  }
}

/**
 * Helper to get all verified notification emails for a buyer/seller.
 * The primary email is always considered verified.
 * Secondary emails are included only if they are present in notificationEmails
 * AND present in verifiedSecondaryEmails.
 */
export function getVerifiedNotificationEmails(user: User): string[] {
  if (!user) return []
  const primary = user.email
  const secondaries = user.secondaryEmails || []
  const verifiedSecondaries = user.verifiedSecondaryEmails || []
  const preferences = user.notificationEmails || [primary]

  return preferences.filter(email => {
    if (!email) return false
    const isPrimary = email.toLowerCase() === primary.toLowerCase()
    const isVerifiedSecondary = secondaries.some(s => s.toLowerCase() === email.toLowerCase()) && 
                               verifiedSecondaries.some(vs => vs.toLowerCase() === email.toLowerCase())
    return isPrimary || isVerifiedSecondary
  })
}

async function mapInquiryFromDb(row: any, id: string): Promise<Inquiry> {
  const itemsQ = query(collection(db, "inquiry_items"), where("inquiry_id", "==", row.id || id))
  const itemsSnap = await getDocs(itemsQ)

  const mappedItems = itemsSnap.docs.map((docSnap) => {
    const item = docSnap.data()
    return {
      id: item.id || docSnap.id,
      product: item.product,
      sub_product: item.sub_product,
      paymentTerms: item.payment_terms,
      options: item.options || {},
      remarks: item.remarks,
    }
  })

  const offerQ = query(collection(db, "offers"), where("inquiry_id", "==", row.id || id), where("status", "==", "accepted"), limit(1))
  const offerSnap = await getDocs(offerQ)

  const allOffersQ = query(collection(db, "offers"), where("inquiry_id", "==", row.id || id), where("archived", "==", false))
  const allOffersSnap = await getCountFromServer(allOffersQ)

  const hasAcceptedOffer = !offerSnap.empty
  let derivedStatus = row.status

  if (row.status !== "deleted") {
    derivedStatus = hasAcceptedOffer ? "closed" : row.status
    if (derivedStatus === "bidding" && row.bidding_deadline) {
      if (new Date() > new Date(row.bidding_deadline)) {
        derivedStatus = "closed"
      }
    }
  }

  return {
    id: row.id || id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerAlias: row.buyer_alias || "Buyer-???",
    items: mappedItems,
    status: derivedStatus,
    biddingDeadline: row.bidding_deadline,
    createdAt: row.created_at,
    deliveryAddress: row.delivery_address || "",
    district: row.district || "",
    state: row.state || "",
    pinCode: row.pin_code || "",
    rebidCount: row.rebid_count || 0,
    offersCount: allOffersSnap.data().count,
  }
}

function mapOfferFromDb(row: any, id: string): Offer {
  return {
    id: row.id || id,
    inquiryId: row.inquiry_id,
    inquiryItemId: row.inquiry_item_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name || "Anonymous Seller",
    pricePerTon: row.price_per_ton,
    comments: row.comments || "",
    pdfUrl: row.pdf_url,
    attachments: row.attachments || [],
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    rank: row.rank,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    sellerOptions: row.seller_options || {},
    sellerAlias: row.seller_alias || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived || false,
  }
}

async function getNextBuyerId(): Promise<string> {
  const q = query(collection(db, "buyers"), orderBy("id", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return "BUY-0001"
  const lastNum = parseInt(snap.docs[0].id.split("-")[1])
  if (isNaN(lastNum)) return "BUY-0001"
  return `BUY-${String(lastNum + 1).padStart(4, "0")}`
}

async function getNextSellerId(): Promise<string> {
  const q = query(collection(db, "sellers"), orderBy("id", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return "SEL-0001"
  const lastNum = parseInt(snap.docs[0].id.split("-")[1])
  if (isNaN(lastNum)) return "SEL-0001"
  return `SEL-${String(lastNum + 1).padStart(4, "0")}`
}

async function generateUserCode(role: "buyer" | "seller"): Promise<string> {
  const collectionName = role === "buyer" ? "buyers" : "sellers"
  const prefix = role === "buyer" ? "B" : "S"
  const snapshot = await getCountFromServer(collection(db, collectionName))
  const count = snapshot.data().count + 1

  // Logic: 001 - 999 (3 digits), 0001+ (4+ digits)
  const paddingLength = count <= 999 ? 3 : String(count).length + 1
  return `${prefix}${String(count).padStart(paddingLength, "0")}`
}

async function generatePublicAlias(role: "buyer" | "seller"): Promise<string> {
  const collectionName = role === "buyer" ? "inquiries" : "offers"
  const prefix = role === "buyer" ? "Buyer" : "Seller"
  const snapshot = await getCountFromServer(collection(db, collectionName))
  const count = snapshot.data().count + 1

  const paddingLength = count <= 999 ? 3 : String(count).length + 1
  return `${prefix}-${String(count).padStart(paddingLength, "0")}`
}

async function getNextInquiryId(): Promise<string> {
  const q = query(collection(db, "inquiries"), orderBy("id", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return "INQ-0001"
  const lastNum = parseInt(snap.docs[0].id.split("-")[1])
  if (isNaN(lastNum)) return "INQ-0001"
  return `INQ-${String(lastNum + 1).padStart(4, "0")}`
}

async function getNextInquiryItemId(): Promise<string> {
  const q = query(collection(db, "inquiry_items"), orderBy("id", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return "ITEM-0001"
  const lastNum = parseInt(snap.docs[0].id.split("-")[1])
  if (isNaN(lastNum)) return "ITEM-0001"
  return `ITEM-${String(lastNum + 1).padStart(4, "0")}`
}

async function getNextOfferId(): Promise<string> {
  const q = query(collection(db, "offers"), orderBy("id", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return "OFR-0001"
  const lastNum = parseInt(snap.docs[0].id.split("-")[1])
  if (isNaN(lastNum)) return "OFR-0001"
  return `OFR-${String(lastNum + 1).padStart(4, "0")}`
}

async function getNextSellerAlias(): Promise<string> {
  const q = query(collection(db, "offers"), orderBy("seller_alias", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return "Seller-001"

  const lastAlias = snap.docs[0].data().seller_alias;
  if (!lastAlias || !lastAlias.includes("-")) return "Seller-001"

  const lastNum = parseInt(lastAlias.split("-")[1])
  if (isNaN(lastNum)) return "Seller-001"

  const nextNum = lastNum + 1
  const paddingLength = nextNum <= 999 ? 3 : String(nextNum).length + 1
  return `Seller-${String(nextNum).padStart(paddingLength, "0")}`
}

export async function registerUser(data: Omit<User, "id" | "verified" | "createdAt" | "displayName" | "userCode">): Promise<User[]> {
  const createdAt = new Date().toISOString()

  // Create the actual Firebase Auth user FIRST
  try {
    if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== data.email.toLowerCase()) {
      await createUserWithEmailAndPassword(auth, data.email, data.password)
    }
  } catch (error: any) {
    if (error.code !== 'auth/email-already-in-use') {
      logger.error("Failed to create Firebase Auth user", { error: error.message })
      throw new Error(error.message || "Failed to create authentication context")
    }
  }

  const users: User[] = [];

  if (data.role === "buyer" || data.role === "both") {
    const id = await getNextBuyerId()
    const userCode = await generateUserCode("buyer")
    const displayName = userCode

    await setDoc(doc(db, "buyers", id), {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      password: data.password,
      company: data.company || null,
      entity_type: data.entityType,
      aadhaar_number: data.aadhaarNumber || null,
      aadhaar_document_path: data.aadhaarDocumentPath || null,
      gstin: data.gstin || null,
      gst_certificate_path: data.gstCertificatePath || null,
      display_name: displayName,
      user_code: userCode,
      verified: false,
      google_connected: false,
      created_at: createdAt,
      auth_uid: auth.currentUser?.uid || null,
      sms_notifications_enabled: true,
    })

    users.push({
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      company: data.company,
      role: "buyer",
      entityType: data.entityType,
      verificationType: data.verificationType,
      gstin: data.gstin,
      gstCertificatePath: data.gstCertificatePath,
      aadhaarNumber: data.aadhaarNumber,
      aadhaarDocumentPath: data.aadhaarDocumentPath,
      displayName,
      userCode,
      verified: false,
      googleConnected: false,
      createdAt,
      smsNotificationsEnabled: true,
    })
  }

  if (data.role === "seller" || data.role === "both") {
    const id = await getNextSellerId()
    const userCode = await generateUserCode("seller")
    const displayName = userCode

    await setDoc(doc(db, "sellers", id), {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      password: data.password,
      company: data.company || "",
      entity_type: data.entityType,
      verification_type: data.verificationType,
      gstin: data.gstin || null,
      gst_certificate_path: data.gstCertificatePath || null,
      aadhaar_number: data.aadhaarNumber || null,
      aadhaar_document_path: data.aadhaarDocumentPath || null,
      display_name: displayName,
      user_code: userCode,
      verified: false,
      google_connected: false,
      created_at: createdAt,
      auth_uid: auth.currentUser?.uid || null,
      categories: data.categories || [],
      product_manufacturers: data.productManufacturers || {},
      sms_notifications_enabled: true,
    })

    users.push({
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      company: data.company || "",
      role: "seller",
      entityType: data.entityType,
      verificationType: data.verificationType,
      gstin: data.gstin,
      gstCertificatePath: data.gstCertificatePath,
      aadhaarNumber: data.aadhaarNumber,
      aadhaarDocumentPath: data.aadhaarDocumentPath,
      displayName,
      userCode,
      verified: false,
      googleConnected: false,
      createdAt,
      categories: data.categories || [],
      productManufacturers: data.productManufacturers || {},
      smsNotificationsEnabled: true,
    })
  }

  return users;
}

export async function loginUser(email: string, password: string, role?: UserRole): Promise<User[] | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (error: any) {
    logger.error("Firebase Auth sign in failed", { error: error.message })
    return null
  }

  const users: User[] = [];

  if (role === "buyer" || !role) {
    const q = query(collection(db, "buyers"), where("email", "==", email.toLowerCase()), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) users.push(mapBuyerFromDb(snap.docs[0].data(), snap.docs[0].id))
  }

  if (role === "seller" || !role) {
    const q = query(collection(db, "sellers"), where("email", "==", email.toLowerCase()), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) users.push(mapSellerFromDb(snap.docs[0].data(), snap.docs[0].id))
  }

  return users.length > 0 ? users : null
}

export async function loginUserWithGoogle(email: string): Promise<User[] | null> {
  const users: User[] = [];
  const normalizedEmail = email.toLowerCase();

  const bq = query(collection(db, "buyers"), or(where("email", "==", normalizedEmail), where("google_email", "==", normalizedEmail)), limit(1))
  const bSnap = await getDocs(bq)
  if (!bSnap.empty) {
    const docSnap = bSnap.docs[0]
    const data = docSnap.data()
    if (!data.google_connected || !data.google_email) {
      await updateDoc(doc(db, "buyers", docSnap.id), { google_connected: true, google_email: normalizedEmail })
      data.google_connected = true
      data.google_email = normalizedEmail
    }
    users.push(mapBuyerFromDb(data, docSnap.id))
  }

  const sq = query(collection(db, "sellers"), or(where("email", "==", normalizedEmail), where("google_email", "==", normalizedEmail)), limit(1))
  const sSnap = await getDocs(sq)
  if (!sSnap.empty) {
    const docSnap = sSnap.docs[0]
    const data = docSnap.data()
    if (!data.google_connected || !data.google_email) {
      await updateDoc(doc(db, "sellers", docSnap.id), { google_connected: true, google_email: normalizedEmail })
      data.google_connected = true
      data.google_email = normalizedEmail
    }
    users.push(mapSellerFromDb(data, docSnap.id))
  }

  if (users.length === 0) {
    logger.warn(`Failed Google Login: Email ${email} not found.`)
    return null
  }

  return users
}

export async function connectUserWithGoogle(userId: string, googleEmail: string): Promise<boolean> {
  try {
    let accountEmail: string | null = null;

    // 1. Find the current user's email to identify the owner
    if (userId.startsWith("BUY-")) {
      const q = query(collection(db, "buyers"), where("id", "==", userId))
      const snaps = await getDocs(q)
      if (!snaps.empty) accountEmail = snaps.docs[0].data().email;
    } else if (userId.startsWith("SEL-")) {
      const q = query(collection(db, "sellers"), where("id", "==", userId))
      const snaps = await getDocs(q)
      if (!snaps.empty) accountEmail = snaps.docs[0].data().email;
    }

    if (!accountEmail) return false;

    // 2. Update all records matching this account email in both collections
    const normalizedAccountEmail = accountEmail.toLowerCase();
    const normalizedGoogleEmail = googleEmail.toLowerCase();

    const bq = query(collection(db, "buyers"), where("email", "==", normalizedAccountEmail))
    const bSnaps = await getDocs(bq)
    for (const d of bSnaps.docs) {
      await updateDoc(d.ref, { google_connected: true, google_email: normalizedGoogleEmail })
    }

    const sq = query(collection(db, "sellers"), where("email", "==", normalizedAccountEmail))
    const sSnaps = await getDocs(sq)
    for (const d of sSnaps.docs) {
      await updateDoc(d.ref, { google_connected: true, google_email: normalizedGoogleEmail })
    }

    return true;
  } catch (e: any) {
    logger.error("Error connecting Google", { error: e.message })
  }
  return false
}

export async function getUserById(id: string): Promise<User | null> {
  if (id.startsWith("BUY-")) {
    const q = query(collection(db, "buyers"), where("id", "==", id), limit(1));
    const snap = await getDocs(q);
    return !snap.empty ? mapBuyerFromDb(snap.docs[0].data(), snap.docs[0].id) : null;
  } else if (id.startsWith("SEL-")) {
    const q = query(collection(db, "sellers"), where("id", "==", id), limit(1));
    const snap = await getDocs(q);
    return !snap.empty ? mapSellerFromDb(snap.docs[0].data(), snap.docs[0].id) : null;
  }
  return null;
}

export async function createInquiry(
  buyerId: string,
  buyerName: string | null | undefined,
  items: Omit<InquiryItem, "id">[],
  deliveryDetails?: {
    deliveryAddress?: string;
    district?: string;
    state?: string;
    pinCode?: string;
  },
  biddingDuration?: number
): Promise<Inquiry> {
  const inquiryId = await getNextInquiryId()
  const buyerAlias = await generatePublicAlias("buyer")
  const createdAt = new Date().toISOString()

  // ... rest of validation logic ...
  const isBiddingActive = typeof biddingDuration === 'number' && biddingDuration > 0
  let deadline = null

  if (isBiddingActive) {
    const d = new Date()
    d.setDate(d.getDate() + biddingDuration!)
    deadline = d.toISOString()
  }

  await setDoc(doc(db, "inquiries", inquiryId), {
    id: inquiryId,
    buyer_id: buyerId,
    buyer_name: buyerName || "Anonymous Buyer",
    buyer_alias: buyerAlias,
    status: isBiddingActive ? "bidding" : "active",
    bidding_deadline: deadline,
    created_at: createdAt,
    delivery_address: deliveryDetails?.deliveryAddress || null,
    district: deliveryDetails?.district || null,
    state: deliveryDetails?.state || null,
    pin_code: deliveryDetails?.pinCode || null,
  })

  const inquiryItems: InquiryItem[] = []
  for (const item of items) {
    const itemId = await getNextInquiryItemId()
    await setDoc(doc(db, "inquiry_items", itemId), {
      id: itemId,
      inquiry_id: inquiryId,
      product: item.product,
      sub_product: (item as any).sub_product || null,
      payment_terms: item.paymentTerms,
      options: item.options || {},
      remarks: item.remarks || null,
    })

    inquiryItems.push({
      ...item,
      id: itemId,
      options: item.options || {},
      remarks: item.remarks || undefined,
    })
  }

  return {
    id: inquiryId,
    buyerId,
    buyerName: buyerName || "Anonymous Buyer",
    buyerAlias,
    items: inquiryItems,
    status: isBiddingActive ? "bidding" : "active",
    biddingDeadline: deadline || undefined,
    createdAt,
    deliveryAddress: deliveryDetails?.deliveryAddress || "",
    district: deliveryDetails?.district || "",
    state: deliveryDetails?.state || "",
    pinCode: deliveryDetails?.pinCode || "",
  }
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const q = query(collection(db, "inquiries"), where("id", "==", id), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null;
  return await mapInquiryFromDb(snap.docs[0].data(), snap.docs[0].id)
}

export async function getInquiriesByBuyerId(buyerId: string): Promise<Inquiry[]> {
  const q = query(collection(db, "inquiries"), where("buyer_id", "==", buyerId))
  const snap = await getDocs(q)
  let mapped = await Promise.all(snap.docs.map(d => mapInquiryFromDb(d.data(), d.id)))

  // Filter out any internally soft deleted
  mapped = mapped.filter(inq => inq.status !== "deleted")

  // Sort descending by created_at in memory to avoid needing a Firestore Composite Index
  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return mapped;
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  const q = query(collection(db, "inquiries"))
  const snap = await getDocs(q)
  const mapped = await Promise.all(snap.docs.map(d => mapInquiryFromDb(d.data(), d.id)))

  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return mapped
}

export async function getOpenInquiries(): Promise<Inquiry[]> {
  const q = query(collection(db, "inquiries"), where("status", "in", ["active", "open", "bidding"]))
  const snap = await getDocs(q)
  let mapped = await Promise.all(snap.docs.map(d => mapInquiryFromDb(d.data(), d.id)))

  mapped = mapped.filter(inq => inq.status !== "closed")
  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return mapped
}

export async function updateInquiryItem(inquiryId: string, itemId: string, data: Partial<InquiryItem>): Promise<void> {
  const updateData: any = {}
  if (data.paymentTerms !== undefined) updateData.payment_terms = data.paymentTerms
  if (data.product !== undefined) updateData.product = data.product
  if (data.sub_product !== undefined) updateData.sub_product = data.sub_product
  if (data.options !== undefined) updateData.options = data.options

  const q = query(collection(db, "inquiry_items"), where("id", "==", itemId), where("inquiry_id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "inquiry_items", snap.docs[0].id), updateData)
  }
}

export async function deleteInquiryItem(inquiryId: string, itemId: string): Promise<void> {
  const q = query(collection(db, "inquiry_items"), where("id", "==", itemId), where("inquiry_id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await deleteDoc(doc(db, "inquiry_items", snap.docs[0].id))
  }
}

export async function closeInquiry(inquiryId: string): Promise<void> {
  const q = query(collection(db, "inquiries"), where("id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "inquiries", snap.docs[0].id), { status: "closed" })
  }
}

export async function softDeleteInquiry(inquiryId: string, userId: string): Promise<void> {
  const q = query(collection(db, "inquiries"), where("id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return;

  const inqDoc = snap.docs[0]
  const inqData = inqDoc.data()

  const user = await getUserById(userId)

  try {
    await setDoc(doc(db, "soft_deleted_inquiries", inquiryId), {
      ...inqData,
      deleted_by_user_id: user?.id || userId,
      deleted_by_user_name: user?.name || "Unknown",
      deleted_by_user_email: user?.email || "Unknown",
      deleted_at: new Date().toISOString()
    });
  } catch (archiveError: any) {
    logger.warn("Failed to write to archive collection soft_deleted_inquiries, skipping", { error: archiveError.message })
  }

  await updateDoc(inqDoc.ref, { status: "deleted" })
}

export async function reopenInquiry(inquiryId: string): Promise<void> {
  const q = query(collection(db, "inquiries"), where("id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "inquiries", snap.docs[0].id), {
      status: "open",
      bidding_deadline: null
    })
  }
}

export async function getSellerContactInfoFromOffers(inquiryId: string): Promise<{phone: string, email: string, emails?: string[]}[]> {
  const q = query(collection(db, "offers"), where("inquiry_id", "==", inquiryId))
  const snap = await getDocs(q)
  if (snap.empty) return []

  const sellerIds = [...new Set(snap.docs.map(d => d.data().seller_id))]

  const contacts: {phone: string, email: string, emails?: string[]}[] = []
  const chunkSize = 10;
  for (let i = 0; i < sellerIds.length; i += chunkSize) {
    const chunk = sellerIds.slice(i, i + chunkSize);
    const sq = query(collection(db, "sellers"), where("id", "in", chunk))
    const sSnap = await getDocs(sq)
    contacts.push(...sSnap.docs.map(d => {
      const seller = mapSellerFromDb(d.data(), d.id)
      const emails = getVerifiedNotificationEmails(seller)
      return { 
        phone: seller.phone, 
        email: seller.email,
        emails: emails.length > 0 ? emails : [seller.email]
      }
    }))
  }
  return contacts;
}

export async function getAllSellerPhones(): Promise<string[]> {
  const q = query(collection(db, "sellers"), where("verified", "==", true))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().phone).filter(p => !!p)
}

export async function getSellersContactInfoByCategories(categories: string[]): Promise<{phone: string, email: string, emails?: string[]}[]> {
  if (!categories || categories.length === 0) return []

  // We fetch all verified sellers and filter in memory since firestore array-contains-any 
  // has a limit of 10 and we might have more categories or want simpler logic.
  // If the number of sellers grows huge, this would need optimization, but for now it's fine.
  const q = query(collection(db, "sellers"), where("verified", "==", true))
  const snap = await getDocs(q)

  return snap.docs
    .map(d => mapSellerFromDb(d.data(), d.id))
    .filter(seller => {
      const sellerCategories: string[] = seller.categories || []
      // Check if there is any intersection between seller categories and required categories
      return sellerCategories.some(c => categories.includes(c))
    })
    .map(seller => {
      const emails = getVerifiedNotificationEmails(seller)
      return { 
        phone: seller.phone, 
        email: seller.email,
        emails: emails.length > 0 ? emails : [seller.email]
      }
    })
    .filter(contact => !!contact.phone || !!contact.email)
}

export async function activateBidding(inquiryId: string, durationInDays: number): Promise<void> {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + durationInDays)

  const q = query(collection(db, "inquiries"), where("id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const data = snap.docs[0].data()
    const currentRebidCount = data.rebid_count || 0
    if (currentRebidCount >= 1) {
      throw new Error("Re-bid can only be used once per inquiry")
    }
    await updateDoc(doc(db, "inquiries", snap.docs[0].id), {
      status: "bidding",
      bidding_deadline: deadline.toISOString(),
      rebid_count: currentRebidCount + 1
    })
  }
}

export async function startBidding(inquiryId: string, durationInDays: number): Promise<void> {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + durationInDays)

  const q = query(collection(db, "inquiries"), where("id", "==", inquiryId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "inquiries", snap.docs[0].id), {
      status: "bidding",
      bidding_deadline: deadline.toISOString()
    })
  }
}

export async function createOffer(data: Omit<Offer, "id" | "rank" | "createdAt" | "updatedAt"> & { sellerName?: string | null }): Promise<Offer> {
  const id = await getNextOfferId()
  const createdAt = new Date().toISOString()
  const updatedAt = createdAt

  let alias = ""
  const qAlias = query(collection(db, "offers"), where("inquiry_id", "==", data.inquiryId), where("seller_id", "==", data.sellerId), limit(1))
  const snapAlias = await getDocs(qAlias)

  if (!snapAlias.empty && snapAlias.docs[0].data().seller_alias) {
    alias = snapAlias.docs[0].data().seller_alias
  } else {
    alias = await getNextSellerAlias()
  }

  await setDoc(doc(db, "offers", id), {
    id,
    inquiry_id: data.inquiryId,
    inquiry_item_id: data.inquiryItemId,
    seller_id: data.sellerId,
    seller_name: data.sellerName || "Anonymous Seller",
    price_per_ton: data.pricePerTon,
    comments: data.comments || "",
    pdf_url: data.pdfUrl || null,
    attachments: data.attachments || [],
    contact_email: data.contactEmail || null,
    contact_phone: data.contactPhone || null,
    seller_options: data.sellerOptions || {},
    seller_alias: alias,
    status: data.status,
    created_at: createdAt,
    updated_at: updatedAt,
    archived: data.archived || false,
  })

  return { ...data, id, createdAt, updatedAt, sellerAlias: alias, sellerName: data.sellerName || "Anonymous Seller" } as Offer
}

export async function updateOffer(offerId: string, data: Partial<Offer>): Promise<void> {
  const updateData: any = {}
  if (data.pricePerTon !== undefined) updateData.price_per_ton = data.pricePerTon
  if (data.comments !== undefined) updateData.comments = data.comments
  if (data.pdfUrl !== undefined) updateData.pdf_url = data.pdfUrl
  if (data.attachments !== undefined) updateData.attachments = data.attachments
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone
  if (data.sellerOptions !== undefined) updateData.seller_options = data.sellerOptions
  if (data.status !== undefined) updateData.status = data.status
  if (data.archived !== undefined) updateData.archived = data.archived

  updateData.updated_at = new Date().toISOString()

  // 1. Try resolving by document ID first
  try {
    const docRef = doc(db, "offers", offerId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      await updateDoc(docRef, updateData)
      return
    }
  } catch (e) {
    console.error("Doc ID lookup failed, trying id field", e)
  }

  // 2. If not found by doc ID, try resolving by the 'id' field
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), updateData)
  }
}

export async function deleteOffer(offerId: string): Promise<void> {
  // 1. Try resolving by document ID first
  try {
    const docRef = doc(db, "offers", offerId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      await deleteDoc(docRef)
      return
    }
  } catch (e) {
    console.error("Doc ID lookup failed, trying id field", e)
  }

  // 2. If not found by doc ID, try resolving by the 'id' field
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await deleteDoc(doc(db, "offers", snap.docs[0].id))
  }
}

export async function getOffersByInquiryId(inquiryId: string): Promise<Offer[]> {
  const q = query(collection(db, "offers"), where("inquiry_id", "==", inquiryId))
  const snap = await getDocs(q)

  let offers = snap.docs.map(d => mapOfferFromDb(d.data(), d.id))

  // Filter out soft-deleted offers
  offers = offers.filter(o => o.status !== "deleted")

  // Sort ascending by price_per_ton, then ascending by created_at
  offers.sort((a, b) => {
    if (a.pricePerTon === b.pricePerTon) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    return a.pricePerTon - b.pricePerTon
  })

  const itemOffersMap: Record<string, Offer[]> = {}
  offers.forEach(o => {
    if (!itemOffersMap[o.inquiryItemId]) itemOffersMap[o.inquiryItemId] = []
    itemOffersMap[o.inquiryItemId].push(o)
  })

  offers.forEach(offer => {
    const competitors = itemOffersMap[offer.inquiryItemId]
    const rankIndex = competitors.findIndex(c => c.id === offer.id)
    if (rankIndex !== -1) offer.rank = rankIndex + 1
  })

  const sellerMap = new Map<string, number>()
  let sellerCounter = 1

  return offers.map(offer => {
    if (!sellerMap.has(offer.sellerId)) {
      sellerMap.set(offer.sellerId, sellerCounter++)
    }
    return {
      ...offer,
      anonymizedSeller: offer.sellerAlias || `Seller ${sellerMap.get(offer.sellerId)}`
    }
  })
}

export async function revertOfferToPending(offerId: string): Promise<void> {
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), { status: "pending" })
  }
}

export async function getOffersBySellerId(sellerId: string): Promise<Offer[]> {
  const q = query(collection(db, "offers"), where("seller_id", "==", sellerId))
  const snap = await getDocs(q)
  const offers = snap.docs.map(d => mapOfferFromDb(d.data(), d.id)).filter(o => o.status !== "deleted")

  offers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const sellerMap = new Map<string, number>()
  let sellerCounter = 1

  const itemIds = [...new Set(offers.map(o => o.inquiryItemId))]
  if (itemIds.length > 0) {
    // We must chunk 'in' queries
    const chunkSize = 10;
    const allItemOffers: any[] = []
    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize);
      const cQ = query(collection(db, "offers"), where("inquiry_item_id", "in", chunk))
      const cSnap = await getDocs(cQ)
      allItemOffers.push(...cSnap.docs.map(d => d.data()).filter(o => o.status !== "deleted"))
    }
    if (allItemOffers.length > 0) {
      const itemOffersMap: Record<string, { id: string, price: number, createdAt: string }[]> = {}
      allItemOffers.forEach(o => {
        if (!itemOffersMap[o.inquiry_item_id]) itemOffersMap[o.inquiry_item_id] = []
        itemOffersMap[o.inquiry_item_id].push({ id: o.id, price: o.price_per_ton, createdAt: o.created_at })
      })

      offers.forEach(offer => {
        const competitors = itemOffersMap[offer.inquiryItemId]
        if (competitors) {
          competitors.sort((a, b) => {
            if (a.price === b.price) {
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            }
            return a.price - b.price
          })
          const rankIndex = competitors.findIndex(c => c.id === offer.id)
          if (rankIndex !== -1) offer.rank = rankIndex + 1
        }
      })

      // Fetch inquiry items to get requested quantities for total price calculation
      const items: any[] = []
      for (let i = 0; i < itemIds.length; i += 10) {
        const chunk = itemIds.slice(i, i + 10);
        const iqQ = query(collection(db, "inquiry_items"), where("id", "in", chunk))
        const iqSnap = await getDocs(iqQ)
        items.push(...iqSnap.docs.map(d => d.data()))
      }

      if (items.length > 0) {
        const itemQtyMap = new Map<string, number>()
        const itemToInquiryMap = new Map<string, string>()
        items.forEach(item => {
          const qtyRaw = item.options?.["Quantity"] || item.options?.["Qty"] || item.options?.["quantity"]
          const qty = parseFloat(String(qtyRaw).replace(/[^\d.]/g, '')) || 1
          itemQtyMap.set(item.id, qty)
          itemToInquiryMap.set(item.id, item.inquiry_id)
        })

        const inquiryIds = [...new Set(items.map(i => i.inquiry_id))]
        const inquiryStatusMap = new Map<string, string>()
        if (inquiryIds.length > 0) {
          for (let i = 0; i < inquiryIds.length; i += 10) {
            const chunk = inquiryIds.slice(i, i + 10);
            const inqQ = query(collection(db, "inquiries"), where("id", "in", chunk))
            const inqSnap = await getDocs(inqQ)
            inqSnap.docs.forEach(d => {
              inquiryStatusMap.set(d.id, d.data().status)
            })
          }
        }

        offers.forEach(offer => {
          offer.requestedQuantity = itemQtyMap.get(offer.inquiryItemId) || 1
          const inqId = itemToInquiryMap.get(offer.inquiryItemId)
          if (inqId) {
            (offer as any).inquiryStatus = inquiryStatusMap.get(inqId) || "unknown"
          }
        })
      }
    }
  }

  offers.forEach(offer => {
    if (!sellerMap.has(offer.sellerId)) {
      sellerMap.set(offer.sellerId, sellerCounter++)
    }
    offer.anonymizedSeller = offer.sellerAlias || `Seller ${sellerMap.get(offer.sellerId)}`
  })

  const acceptedOffers = offers.filter(o => o.status === "accepted")
  if (acceptedOffers.length > 0) {
    const inquiryIds = [...new Set(acceptedOffers.map(o => o.inquiryId))]
    const inquiries: any[] = []

    for (let i = 0; i < inquiryIds.length; i += 10) {
      const chunk = inquiryIds.slice(i, i + 10);
      const iQ = query(collection(db, "inquiries"), where("id", "in", chunk))
      const iSnap = await getDocs(iQ)
      inquiries.push(...iSnap.docs.map(d => d.data()))
    }

    if (inquiries.length > 0) {
      const buyerIds = [...new Set(inquiries.map(i => i.buyer_id))]
      const buyers: any[] = []

      for (let i = 0; i < buyerIds.length; i += 10) {
        const chunk = buyerIds.slice(i, i + 10);
        const bQ = query(collection(db, "buyers"), where("id", "in", chunk))
        const bSnap = await getDocs(bQ)
        buyers.push(...bSnap.docs.map(d => d.data()))
      }

      if (buyers.length > 0) {
        const inquiryToBuyerMap = new Map()
        inquiries.forEach(i => inquiryToBuyerMap.set(i.id, i.buyer_id))

        const buyerMap = new Map()
        buyers.forEach(b => buyerMap.set(b.id, b))

        offers.forEach(offer => {
          if (offer.status === "accepted") {
            const buyerId = inquiryToBuyerMap.get(offer.inquiryId)
            if (buyerId) {
              const buyerInfo = buyerMap.get(buyerId)
              if (buyerInfo) {
                offer.buyerName = buyerInfo.name
                offer.buyerEmail = buyerInfo.email
                offer.buyerPhone = buyerInfo.phone
              }
            }
          }
        })
      }
    }
  }

  return offers
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const q = query(collection(db, "offers"), where("id", "==", id), limit(1))
  const snap = await getDocs(q)
  return !snap.empty ? mapOfferFromDb(snap.docs[0].data(), snap.docs[0].id) : null
}

export async function acceptOffer(offerId: string): Promise<void> {
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), { status: "accepted" })
  }
}

export async function rejectOffer(offerId: string): Promise<void> {
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), { status: "rejected" })
  }
}

export async function disqualifyOffer(offerId: string): Promise<void> {
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), { status: "disqualified" })
  }
}

export async function softDeleteOffer(offerId: string): Promise<void> {
  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), { status: "deleted" })
  }
}

export async function updateOfferRanks(inquiryItemId: string): Promise<void> {
  const q = query(collection(db, "offers"), where("inquiry_item_id", "==", inquiryItemId), where("status", "==", "pending"))
  const snap = await getDocs(q)

  if (snap.empty) return;

  // Sort by price ascending
  const docs = snap.docs.map(d => ({ id: d.id, price: d.data().price_per_ton }))
  docs.sort((a, b) => a.price - b.price)

  for (let index = 0; index < docs.length; index++) {
    await updateDoc(doc(db, "offers", docs[index].id), { rank: index + 1 })
  }
}

export async function getAcceptedOffersByUserId(userId: string, role: UserRole): Promise<Offer[]> {
  if (role === "buyer") {
    const iQ = query(collection(db, "inquiries"), where("buyer_id", "==", userId))
    const iSnap = await getDocs(iQ)
    const inqIds = iSnap.docs.map(d => d.data().id)
    if (inqIds.length === 0) return []

    const offers: Offer[] = []
    for (let i = 0; i < inqIds.length; i += 10) {
      const chunk = inqIds.slice(i, i + 10);
      const oQ = query(collection(db, "offers"), where("status", "==", "accepted"), where("inquiry_id", "in", chunk))
      const oSnap = await getDocs(oQ)
      offers.push(...oSnap.docs.map(d => mapOfferFromDb(d.data(), d.id)))
    }
    return offers;
  } else if (role === "seller") {
    const q = query(collection(db, "offers"), where("seller_id", "==", userId), where("status", "==", "accepted"))
    const snap = await getDocs(q)
    const offers = snap.docs.map(d => mapOfferFromDb(d.data(), d.id))
    offers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return offers
  }
  return []
}

export async function getProducts(): Promise<{ id: string, name: string, sub_products?: string[], image_url?: string }[]> {
  const q = query(collection(db, "products"))
  const snap = await getDocs(q)
  const products = snap.docs.map((p) => ({
    id: p.data().product_id?.toString() || p.id,
    name: p.data().name,
    sub_products: p.data().sub_products || [],
    image_url: p.data().image_url || null
  }))

  const sequence = [
    "Cement",
    "TMT Rebars",
    "Pipes-Tubes-Hollow Sections",
    "Beam, Column, Channel, Angle",
    "HR Plates or Coils",
    "GP-GI Coils or Purlins",
    "Color-coated Coils or Sheets",
    "Bare Galvalume Coils or Sheets for Roof"
  ]

  products.sort((a, b) => {
    const idxA = sequence.findIndex(s => a.name.includes(s) || s.includes(a.name));
    const idxB = sequence.findIndex(s => b.name.includes(s) || s.includes(b.name));

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  })

  return products
}

export interface ProductOption {
  id: string
  product_id: string
  sub_product?: string
  option_name: string
  buyer_option_type: string
  seller_option_type: string
  dropdown_values?: string[]
}

export async function getAllProductOptions(): Promise<ProductOption[]> {
  const q = query(collection(db, "product_options"))
  const snap = await getDocs(q)
  return snap.docs.map(docSnap => ({
    ...(docSnap.data() as ProductOption),
    id: docSnap.id
  }))
}

export async function getAllSellerProductOptions(): Promise<Record<string, ProductOption[]>> {
  const options = await getAllProductOptions()
  const result: Record<string, ProductOption[]> = {}

  options.forEach((data) => {
    if (data.seller_option_type && data.seller_option_type !== "none") {
      const pId = String(data.product_id)
      if (!result[pId]) result[pId] = []

      const existingOpt = result[pId].find(o => o.option_name === data.option_name)
      if (existingOpt) {
        if (data.dropdown_values && Array.isArray(data.dropdown_values)) {
          existingOpt.dropdown_values = Array.from(new Set([...(existingOpt.dropdown_values || []), ...data.dropdown_values]))
        }
      } else {
        result[pId].push({ ...data })
      }
    }
  })

  return result
}

export async function getAllProductManufacturers(): Promise<Record<string, string[]>> {
  const q = query(collection(db, "product_options"), where("option_name", "==", "Manufacturer"));
  const snap = await getDocs(q);
  const result: Record<string, string[]> = {};
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.product_id && data.dropdown_values) {
      result[data.product_id.toString()] = data.dropdown_values;
    }
  });
  return result;
}

export async function getUserDisplayName(userId: string, currentUserId: string): Promise<string> {
  if (userId === currentUserId) {
    const user = await getUserById(userId)
    return user ? user.name : "Unknown"
  } else {
    if (userId.startsWith("BUY-")) {
      const q = query(collection(db, "buyers"), where("id", "==", userId), limit(1))
      const snap = await getDocs(q)
      return !snap.empty ? snap.docs[0].data().display_name : "Unknown"
    } else if (userId.startsWith("SEL-")) {
      const q = query(collection(db, "sellers"), where("id", "==", userId), limit(1))
      const snap = await getDocs(q)
      return !snap.empty ? snap.docs[0].data().display_name : "Unknown"
    }
    return "Unknown"
  }
}

export interface UpdateUserData {
  name?: string
  displayName?: string
  phone?: string
  company?: string
  categories?: string[]
  productManufacturers?: Record<string, string[]>
  sellerProductOptions?: Record<string, any[]>
  availableLocations?: Record<string, string[]>
  smsNotificationsEnabled?: boolean
  secondaryEmails?: string[]
  notificationEmails?: string[]
  verifiedSecondaryEmails?: string[]
}

export async function updateUser(userId: string, updates: UpdateUserData): Promise<User | null> {
  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName
  if (updates.phone !== undefined) updateData.phone = updates.phone
  if (updates.company !== undefined) updateData.company = updates.company
  if (updates.categories !== undefined) updateData.categories = updates.categories
  if (updates.productManufacturers !== undefined) updateData.product_manufacturers = updates.productManufacturers
  if (updates.sellerProductOptions !== undefined) updateData.seller_product_options = updates.sellerProductOptions
  if (updates.availableLocations !== undefined) updateData.available_locations = updates.availableLocations
  if (updates.smsNotificationsEnabled !== undefined) updateData.sms_notifications_enabled = updates.smsNotificationsEnabled
  if (updates.secondaryEmails !== undefined) updateData.secondary_emails = updates.secondaryEmails
  if (updates.notificationEmails !== undefined) updateData.notification_emails = updates.notificationEmails
  if (updates.verifiedSecondaryEmails !== undefined) updateData.verified_secondary_emails = updates.verifiedSecondaryEmails

  try {
    if (userId.startsWith("BUY-")) {
      await updateDoc(doc(db, "buyers", userId), updateData)
    } else if (userId.startsWith("SEL-")) {
      await updateDoc(doc(db, "sellers", userId), updateData)
    } else {
      return null
    }

    return await getUserById(userId)
  } catch (error: any) {
    logger.error("Failed to update user profile", { error: error.message, userId })
    throw error
  }
}

export async function updateUserPasswordByEmail(email: string, newPassword: string): Promise<boolean> {
  try {
    // Check buyers
    const normalizedEmail = email.toLowerCase();
    const bq = query(collection(db, "buyers"), where("email", "==", normalizedEmail), limit(1))
    const bSnap = await getDocs(bq)
    if (!bSnap.empty) {
      await updateDoc(doc(db, "buyers", bSnap.docs[0].id), { password: newPassword })
      return true
    }

    // Check sellers
    const sq = query(collection(db, "sellers"), where("email", "==", normalizedEmail), limit(1))
    const sSnap = await getDocs(sq)
    if (!sSnap.empty) {
      await updateDoc(doc(db, "sellers", sSnap.docs[0].id), { password: newPassword })
      return true
    }

    logger.warn(`Failed to update Firestore password: Email ${email} not found.`)
    return false
  } catch (error: any) {
    logger.error("Failed to update Firestore password", { error: error.message, email })
    return false
  }
}
