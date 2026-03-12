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
  verified: boolean
  googleConnected: boolean
  createdAt: string
  categories?: string[]
  smsNotificationsEnabled: boolean
}

export interface InquiryItem {
  id: string
  product: string
  paymentTerms: string
  options?: Record<string, string | string[]>
}

export interface Inquiry {
  id: string
  buyerId: string
  buyerName: string
  items: InquiryItem[]
  status: "open" | "bidding" | "closed"
  biddingDeadline?: string
  createdAt: string
  deliveryAddress?: string
  district?: string
  state?: string
  pinCode?: string
}

export interface Offer {
  id: string
  inquiryId: string
  inquiryItemId: string
  sellerId: string
  sellerName: string
  anonymizedSeller?: string
  pricePerTon: number
  comments: string
  pdfUrl?: string
  contactEmail?: string
  contactPhone?: string
  status: "pending" | "accepted" | "rejected" | "disqualified" | "deleted"
  rank?: number
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  createdAt: string
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
    verified: Boolean(row.verified),
    googleConnected: Boolean(row.google_connected),
    createdAt: row.created_at,
    smsNotificationsEnabled: row.sms_notifications_enabled !== false, // default to true
  }
}

function mapSellerFromDb(row: any, id: string): User {
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
    verified: Boolean(row.verified),
    googleConnected: Boolean(row.google_connected),
    createdAt: row.created_at,
    categories: row.categories || [],
    smsNotificationsEnabled: row.sms_notifications_enabled !== false, // default to true
  }
}

async function mapInquiryFromDb(row: any, id: string): Promise<Inquiry> {
  const itemsQ = query(collection(db, "inquiry_items"), where("inquiry_id", "==", row.id || id))
  const itemsSnap = await getDocs(itemsQ)

  const mappedItems = itemsSnap.docs.map((docSnap) => {
    const item = docSnap.data()
    return {
      id: item.id || docSnap.id,
      product: item.product,
      paymentTerms: item.payment_terms,
      options: item.options || {},
    }
  })

  const offerQ = query(collection(db, "offers"), where("inquiry_id", "==", row.id || id), where("status", "==", "accepted"), limit(1))
  const offerSnap = await getDocs(offerQ)

  const hasAcceptedOffer = !offerSnap.empty
  const derivedStatus = hasAcceptedOffer ? "closed" : row.status

  return {
    id: row.id || id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    items: mappedItems,
    status: derivedStatus,
    biddingDeadline: row.bidding_deadline,
    createdAt: row.created_at,
    deliveryAddress: row.delivery_address || "",
    district: row.district || "",
    state: row.state || "",
    pinCode: row.pin_code || "",
  }
}

function mapOfferFromDb(row: any, id: string): Offer {
  return {
    id: row.id || id,
    inquiryId: row.inquiry_id,
    inquiryItemId: row.inquiry_item_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    pricePerTon: row.price_per_ton,
    comments: row.comments || "",
    pdfUrl: row.pdf_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    rank: row.rank,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    createdAt: row.created_at,
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

async function generateBuyerDisplayName(): Promise<string> {
  const snapshot = await getCountFromServer(collection(db, "buyers"))
  return `buyer${snapshot.data().count + 1}`
}

async function generateSellerDisplayName(): Promise<string> {
  const snapshot = await getCountFromServer(collection(db, "sellers"))
  return `seller${snapshot.data().count + 1}`
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

export async function registerUser(data: Omit<User, "id" | "verified" | "createdAt" | "displayName">): Promise<User> {
  const createdAt = new Date().toISOString()

  // Create the actual Firebase Auth user FIRST
  try {
    if (!auth.currentUser || auth.currentUser.email !== data.email) {
      await createUserWithEmailAndPassword(auth, data.email, data.password)
    }
  } catch (error: any) {
    if (error.code !== 'auth/email-already-in-use') {
      logger.error("Failed to create Firebase Auth user", { error: error.message })
      throw new Error(error.message || "Failed to create authentication context")
    }
  }

  if (data.role === "buyer") {
    const id = await getNextBuyerId()
    const displayName = await generateBuyerDisplayName()

    await setDoc(doc(db, "buyers", id), {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      company: data.company || null,
      entity_type: data.entityType,
      aadhaar_number: data.aadhaarNumber || null,
      aadhaar_document_path: data.aadhaarDocumentPath || null,
      gstin: data.gstin || null,
      gst_certificate_path: data.gstCertificatePath || null,
      display_name: displayName,
      verified: false,
      google_connected: false,
      created_at: createdAt,
      auth_uid: auth.currentUser?.uid || null,
      sms_notifications_enabled: true,
    })

    return {
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
      verified: false,
      googleConnected: false,
      createdAt,
      smsNotificationsEnabled: true,
    }
  } else {
    const id = await getNextSellerId()
    const displayName = await generateSellerDisplayName()

    await setDoc(doc(db, "sellers", id), {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      company: data.company || "",
      entity_type: data.entityType,
      gstin: data.gstin || null,
      gst_certificate_path: data.gstCertificatePath || null,
      aadhaar_number: data.aadhaarNumber || null,
      aadhaar_document_path: data.aadhaarDocumentPath || null,
      display_name: displayName,
      verified: false,
      google_connected: false,
      created_at: createdAt,
      auth_uid: auth.currentUser?.uid || null,
      categories: data.categories || [],
      sms_notifications_enabled: true,
    })

    return {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      company: data.company,
      role: "seller",
      entityType: data.entityType,
      verificationType: data.verificationType,
      gstin: data.gstin,
      gstCertificatePath: data.gstCertificatePath,
      aadhaarNumber: data.aadhaarNumber,
      aadhaarDocumentPath: data.aadhaarDocumentPath,
      displayName,
      verified: false,
      googleConnected: false,
      createdAt,
      categories: data.categories || [],
      smsNotificationsEnabled: true,
    }
  }
}

export async function loginUser(email: string, password: string, role?: UserRole): Promise<User | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (error: any) {
    logger.error("Firebase Auth sign in failed", { error: error.message })
    return null
  }

  if (role === "buyer" || !role) {
    const q = query(collection(db, "buyers"), where("email", "==", email), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) return mapBuyerFromDb(snap.docs[0].data(), snap.docs[0].id)
    if (role === "buyer") return null
  }

  if (role === "seller" || !role) {
    const q = query(collection(db, "sellers"), where("email", "==", email), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) return mapSellerFromDb(snap.docs[0].data(), snap.docs[0].id)
  }

  return null
}

export async function loginUserWithGoogle(email: string): Promise<User | null> {
  const bq = query(collection(db, "buyers"), or(where("email", "==", email), where("google_email", "==", email)), limit(1))
  const bSnap = await getDocs(bq)
  if (!bSnap.empty) {
    const docSnap = bSnap.docs[0]
    const data = docSnap.data()
    if (!data.google_connected || !data.google_email) {
      await updateDoc(doc(db, "buyers", docSnap.id), { google_connected: true, google_email: email })
      data.google_connected = true
      data.google_email = email
    }
    return mapBuyerFromDb(data, docSnap.id)
  }

  const sq = query(collection(db, "sellers"), or(where("email", "==", email), where("google_email", "==", email)), limit(1))
  const sSnap = await getDocs(sq)
  if (!sSnap.empty) {
    const docSnap = sSnap.docs[0]
    const data = docSnap.data()
    if (!data.google_connected || !data.google_email) {
      await updateDoc(doc(db, "sellers", docSnap.id), { google_connected: true, google_email: email })
      data.google_connected = true
      data.google_email = email
    }
    return mapSellerFromDb(data, docSnap.id)
  }

  logger.warn(`Failed Google Login: Email ${email} not found.`)
  return null
}

export async function connectUserWithGoogle(userId: string, email: string): Promise<boolean> {
  try {
    if (userId.startsWith("BUY-")) {
      const q = query(collection(db, "buyers"), where("id", "==", userId))
      const snaps = await getDocs(q)
      if (!snaps.empty) {
        await updateDoc(doc(db, "buyers", snaps.docs[0].id), { google_connected: true, google_email: email })
        return true;
      }
    } else if (userId.startsWith("SEL-")) {
      const q = query(collection(db, "sellers"), where("id", "==", userId))
      const snaps = await getDocs(q)
      if (!snaps.empty) {
        await updateDoc(doc(db, "sellers", snaps.docs[0].id), { google_connected: true, google_email: email })
        return true;
      }
    }
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
  buyerName: string,
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
  const createdAt = new Date().toISOString()

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
    buyer_name: buyerName,
    status: isBiddingActive ? "bidding" : "open",
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
      payment_terms: item.paymentTerms,
      options: item.options || {},
    })

    inquiryItems.push({
      ...item,
      id: itemId,
      options: item.options || {},
    })
  }

  return {
    id: inquiryId,
    buyerId,
    buyerName,
    items: inquiryItems,
    status: isBiddingActive ? "bidding" : "open",
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
  const q = query(collection(db, "inquiries"), where("status", "in", ["open", "bidding"]))
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

export async function getSellerPhonesFromOffers(inquiryId: string): Promise<string[]> {
  const q = query(collection(db, "offers"), where("inquiry_id", "==", inquiryId))
  const snap = await getDocs(q)
  if (snap.empty) return []

  const sellerIds = [...new Set(snap.docs.map(d => d.data().seller_id))]

  const phones: string[] = []
  const chunkSize = 10;
  for (let i = 0; i < sellerIds.length; i += chunkSize) {
    const chunk = sellerIds.slice(i, i + chunkSize);
    const sq = query(collection(db, "sellers"), where("id", "in", chunk))
    const sSnap = await getDocs(sq)
    phones.push(...sSnap.docs.map(d => d.data().phone))
  }
  return phones;
}

export async function getAllSellerPhones(): Promise<string[]> {
  const q = query(collection(db, "sellers"), where("verified", "==", true))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().phone).filter(p => !!p)
}

export async function getSellerPhonesByCategories(categories: string[]): Promise<string[]> {
  if (!categories || categories.length === 0) return []

  // We fetch all verified sellers and filter in memory since firestore array-contains-any 
  // has a limit of 10 and we might have more categories or want simpler logic.
  // If the number of sellers grows huge, this would need optimization, but for now it's fine.
  const q = query(collection(db, "sellers"), where("verified", "==", true))
  const snap = await getDocs(q)

  return snap.docs
    .map(d => d.data())
    .filter(seller => {
      const sellerCategories: string[] = seller.categories || []
      // Check if there is any intersection between seller categories and required categories
      return sellerCategories.some(c => categories.includes(c))
    })
    .map(seller => seller.phone)
    .filter(p => !!p)
}

export async function activateBidding(inquiryId: string, durationInDays: number): Promise<void> {
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

export async function createOffer(data: Omit<Offer, "id" | "rank" | "createdAt">): Promise<Offer> {
  const id = await getNextOfferId()
  const createdAt = new Date().toISOString()

  await setDoc(doc(db, "offers", id), {
    id,
    inquiry_id: data.inquiryId,
    inquiry_item_id: data.inquiryItemId,
    seller_id: data.sellerId,
    seller_name: data.sellerName,
    price_per_ton: data.pricePerTon,
    comments: data.comments || "",
    pdf_url: data.pdfUrl || null,
    contact_email: data.contactEmail || null,
    contact_phone: data.contactPhone || null,
    status: data.status,
    created_at: createdAt,
  })

  return { ...data, id, createdAt }
}

export async function updateOffer(offerId: string, data: Partial<Offer>): Promise<void> {
  const updateData: any = {}
  if (data.pricePerTon !== undefined) updateData.price_per_ton = data.pricePerTon
  if (data.comments !== undefined) updateData.comments = data.comments
  if (data.pdfUrl !== undefined) updateData.pdf_url = data.pdfUrl
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone

  const q = query(collection(db, "offers"), where("id", "==", offerId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, "offers", snap.docs[0].id), updateData)
  }
}

export async function deleteOffer(offerId: string): Promise<void> {
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
      anonymizedSeller: `Seller ${sellerMap.get(offer.sellerId)}`
    }
  })
}

export async function getOffersBySellerId(sellerId: string): Promise<Offer[]> {
  const q = query(collection(db, "offers"), where("seller_id", "==", sellerId))
  const snap = await getDocs(q)
  const offers = snap.docs.map(d => mapOfferFromDb(d.data(), d.id)).filter(o => o.status !== "deleted")

  offers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const itemIds = [...new Set(offers.map(o => o.inquiryItemId))]
  if (itemIds.length > 0) {
    // We must chunk 'in' queries
    const chunkSize = 10;
    const allItemOffers: any[] = []
    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize);
      const cQ = query(collection(db, "offers"), where("inquiry_item_id", "in", chunk))
      const cSnap = await getDocs(cQ)
      allItemOffers.push(...cSnap.docs.map(d => d.data()))
    }
    if (allItemOffers.length > 0) {
      const itemOffersMap: Record<string, { id: string, price: number }[]> = {}
      allItemOffers.forEach(o => {
        if (!itemOffersMap[o.inquiry_item_id]) itemOffersMap[o.inquiry_item_id] = []
        itemOffersMap[o.inquiry_item_id].push({ id: o.id, price: o.price_per_ton })
      })

      offers.forEach(offer => {
        const competitors = itemOffersMap[offer.inquiryItemId]
        if (competitors) {
          competitors.sort((a, b) => a.price - b.price)
          const rankIndex = competitors.findIndex(c => c.id === offer.id)
          if (rankIndex !== -1) offer.rank = rankIndex + 1
        }
      })
    }
  }

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

export async function getProducts(): Promise<{ id: string, name: string }[]> {
  const q = query(collection(db, "products"), orderBy("name", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((p) => ({
    id: p.data().product_id?.toString() || p.id,
    name: p.data().name
  }))
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
  email?: string
  phone?: string
  company?: string
  categories?: string[]
  smsNotificationsEnabled?: boolean
}

export async function updateUser(userId: string, updates: UpdateUserData): Promise<User | null> {
  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.phone !== undefined) updateData.phone = updates.phone
  if (updates.company !== undefined) updateData.company = updates.company
  if (updates.categories !== undefined) updateData.categories = updates.categories
  if (updates.smsNotificationsEnabled !== undefined) updateData.sms_notifications_enabled = updates.smsNotificationsEnabled

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
