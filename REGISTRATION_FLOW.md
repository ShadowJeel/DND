# Registration Flow Documentation

## Overview
The registration process has been enhanced with a comprehensive 5-step flow that includes company/individual selection, document verification, and anonymized user display.

## Registration Steps

### Step 1: Role Selection
Users choose their role on the platform:
- **Buyer**: Create inquiries and receive competitive quotes
- **Seller**: Browse inquiries and submit price offers

### Step 2: Entity Type Selection
Users select their registration type:
- **Company**: Business entity requiring GSTIN registration
- **Individual**: Personal account requiring Aadhaar verification

### Step 3: Document Upload
Users must upload verification documents:
- **Company**: GSTIN certificate (Image: JPEG/PNG/JPG, max 2MB)
- **Individual**: Aadhaar card (Image: JPEG/PNG/JPG, max 2MB)

Documents are securely uploaded to **Cloudinary** cloud storage with automatic optimization and CDN delivery.

### Step 4: Verification
Users verify their identity:
- **Company**: Enter and verify GSTIN number against Government GST Portal
- **Individual**: Enter and verify 12-digit Aadhaar number using Verhoeff checksum

### Step 5: Personal/Company Details
Users provide their information:
- **Company**: Company name, email, contact number (WhatsApp), password
- **Individual**: Your name, email, contact number (WhatsApp), password

## Database Schema

### Buyers Table
```sql
- id: TEXT PRIMARY KEY
- name: TEXT NOT NULL
- email: TEXT UNIQUE NOT NULL
- phone: TEXT NOT NULL (WhatsApp number)
- password: TEXT NOT NULL
- company: TEXT (optional for individuals)
- entity_type: TEXT NOT NULL ('company' | 'individual')
- aadhaar_number: TEXT (for individuals)
- aadhaar_document_path: TEXT (path to uploaded Aadhaar image)
- gstin: TEXT (for companies)
- gst_certificate_path: TEXT (path to uploaded GSTIN image)
- display_name: TEXT (e.g., 'buyer1', 'buyer2' )
- verified: INTEGER DEFAULT 1
- created_at: TEXT NOT NULL
```

### Sellers Table
```sql
- id: TEXT PRIMARY KEY
- name: TEXT NOT NULL
- email: TEXT UNIQUE NOT NULL
- phone: TEXT NOT NULL (WhatsApp number)
- password: TEXT NOT NULL
- company: TEXT NOT NULL
- entity_type: TEXT NOT NULL ('company' | 'individual')
- gstin: TEXT (for companies)
- gst_certificate_path: TEXT (path to uploaded GSTIN image)
- aadhaar_number: TEXT (for individuals)
- aadhaar_document_path: TEXT (path to uploaded Aadhaar image)
- display_name: TEXT (e.g., 'seller1', 'seller2')
- verified: INTEGER DEFAULT 1
- created_at: TEXT NOT NULL
```

## Display Name Logic

### Implementation
The system uses **anonymized display names** to protect user privacy:
- **Own Profile**: Users see their real name
- **Other Users**: Users see dummy names (e.g., buyer1, seller1, buyer2, seller2)

### Sequential Naming
Display names are assigned sequentially:
- First buyer registering gets: `buyer1`
- Second buyer registering gets: `buyer2`
- First seller registering gets: `seller1`
- Second seller registering gets: `seller2`

### Usage
To get the correct display name in your code:

```typescript
import { getUserDisplayName } from "@/lib/store"
// or
import { getDisplayNameForUser } from "@/lib/user-utils"

// In your component/function
const displayName = getUserDisplayName(userId, currentUserId)
// Returns real name if userId === currentUserId
// Returns dummy name otherwise
```

## API Endpoints

### POST /api/upload/document
Upload verification documents (GSTIN certificate or Aadhaar card)

**Request Body (FormData):**
- `file`: Image file - JPEG, PNG, or JPG (max 2MB)
- `documentType`: 'gstin' | 'aadhaar'
- `userName`: string (sanitized for filename)

**Response:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/your_cloud_name/image/upload/dnd-purchase/gstin/John_Doe_1234567890.jpg",
  "filePath": "https://res.cloudinary.com/your_cloud_name/image/upload/dnd-purchase/gstin/John_Doe_1234567890.jpg",
  "publicId": "dnd-purchase/gstin/John_Doe_1234567890",
  "fileName": "John_Doe_1234567890.jpg"
}
```

### POST /api/auth/register
Register a new user

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string (WhatsApp)",
  "password": "string",
  "company": "string (optional for individuals)",
  "role": "buyer" | "seller",
  "entityType": "company" | "individual",
  "verificationType": "gst" | "aadhar",
  "gstin": "string (for companies)",
  "aadhaarNumber": "string (for individuals)",
  "documentPath": "string (uploaded file path)"
}
```

**Response:**
```json
{
  "id": "BUY-0001" | "SEL-0001",
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "role": "buyer" | "seller",
  "entityType": "company" | "individual",
  "displayName": "buyer1" | "seller1",
  "verified": true,
  "createdAt": "ISO timestamp"
}
```

## Security Features

1. **File Validation**
   - Only image files accepted (JPEG, PNG, JPG)
   - Maximum file size: 2MB
   - Files stored with sanitized filenames

2. **Document Verification**
   - GSTIN verification against Government GST Portal
   - Aadhaar verification using Verhoeff checksum algorithm

3. **Privacy Protection**
   - Real names hidden from other users
   - Unique dummy names for each user
   - Documents stored securely in separate folders

4. **Data Integrity**
   - All fields validated before submission
   - Minimum password length: 8 characters
   - Email uniqueness enforced at database level

## Frontend Components

### Modified Files
- `app/auth/register/page.tsx` - Complete 5-step registration flow
- `app/api/auth/register/route.ts` - Updated registration API
- `app/api/upload/document/route.ts` - New file upload endpoint

### New Utility Files
- `lib/user-utils.ts` - Helper functions for display names
- `lib/store.ts` - Updated with display name generation

### Database Files
- `lib/db.ts` - Updated schema with new fields

## Testing the Flow

1. Navigate to registration page
2. Select role (Buyer/Seller)
3. Select entity type (Company/Individual)
4. Upload appropriate document (Image: JPEG/PNG/JPG, max 2MB)
5. Verify GSTIN or Aadhaar
6. Fill in personal/company details
7. Submit registration

## Notes for Developers

- Always use `getUserDisplayName()` when displaying user names in the UI
- Never expose real names of other users in API responses
- Document paths are stored as relative paths in the database
- All phone numbers should be WhatsApp-enabled for communication
- The uploads folder has .gitignore to protect sensitive documents
