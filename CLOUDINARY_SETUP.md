# Cloudinary Setup Guide

This project uses **Cloudinary** for secure cloud storage of images and documents. This guide will help you set up and configure Cloudinary for the DND Purchase platform.

## What is Cloudinary?

Cloudinary is a cloud-based media management platform that provides:
- **Secure Storage**: Cloud-based file storage with automatic backups
- **Image Optimization**: Automatic format and quality optimization
- **CDN Delivery**: Global content delivery network for fast load times
- **Easy Integration**: Simple API for uploading and managing files
- **API-based Management**: No need for local file storage

## Getting Started

### Step 1: Create a Cloudinary Account

1. Go to [Cloudinary.com](https://cloudinary.com/)
2. Click "Sign Up Free"
3. Complete the registration process
4. Verify your email address

### Step 2: Get Your Credentials

1. Log in to your Cloudinary Dashboard
2. In the top right corner, you'll see your **Cloud Name**
3. Under "Account Settings" > "API Keys", you'll find:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

**Important**: Keep your API Secret secure! Never commit it to version control.

### Step 3: Configure Environment Variables

Update the `.env` file with your Cloudinary credentials:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

Replace `your_cloud_name`, `your_api_key`, and `your_api_secret` with your actual credentials from Cloudinary.

### Step 4: Verify Installation

The project already has the required packages installed:
- `cloudinary` - Node.js SDK for server-side uploads
- `next-cloudinary` - Next.js component library (optional for frontend)

If you need to reinstall:
```bash
npm install cloudinary next-cloudinary
# or with pnpm
pnpm install cloudinary next-cloudinary
```

## How Document Upload Works

### Local Upload Flow (Before Cloudinary)
```
User Upload → Local File System → Store Path in DB
```

### Cloudinary Upload Flow (After Cloudinary)
```
User Upload → Cloudinary → Store Cloudinary URL in DB → CDN Delivery
```

## Document Upload API

### Endpoint: `POST /api/upload/document`

**Request:**
```javascript
const formData = new FormData()
formData.append("file", fileObject)
formData.append("documentType", "gstin") // or "aadhaar"
formData.append("userName", "John Doe")

const response = await fetch("/api/upload/document", {
  method: "POST",
  body: formData,
})

const data = await response.json()
```

**Response:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/your_cloud_name/image/upload/dnd-purchase/gstin/filename.jpg",
  "filePath": "https://res.cloudinary.com/your_cloud_name/image/upload/dnd-purchase/gstin/filename.jpg",
  "publicId": "dnd-purchase/gstin/filename",
  "fileName": "filename.jpg"
}
```

## Cloudinary Utilities

The project includes a utility module at `lib/cloudinary.ts` with the following functions:

### `uploadToCloudinary(buffer, fileName, folder)`
Upload a file buffer to Cloudinary.

```typescript
import { uploadToCloudinary } from "@/lib/cloudinary"

const result = await uploadToCloudinary(fileBuffer, "my-image.jpg", "gstin")
console.log(result.secure_url) // Get the public URL
```

### `deleteFromCloudinary(publicId)`
Delete a file from Cloudinary.

```typescript
import { deleteFromCloudinary } from "@/lib/cloudinary"

await deleteFromCloudinary("dnd-purchase/gstin/filename")
```

### `getCloudinaryUrl(publicId)`
Get a secure URL for a resource.

```typescript
import { getCloudinaryUrl } from "@/lib/cloudinary"

const url = getCloudinaryUrl("dnd-purchase/aadhaar/filename")
```

### `getOptimizedImageUrl(publicId, options)`
Get an optimized image URL with automatic transformations.

```typescript
import { getOptimizedImageUrl } from "@/lib/cloudinary"

const optimized = getOptimizedImageUrl("dnd-purchase/aadhaar/filename", {
  width: 300,
  height: 300,
  quality: "auto",
  format: "webp",
})
```

## Storage Structure

Documents are organized in Cloudinary with the following structure:

```
dnd-purchase/
├── aadhaar/        # Aadhaar verification documents
│   ├── user1_timestamp.jpg
│   ├── user2_timestamp.jpg
│   └── ...
└── gstin/          # GSTIN verification documents
    ├── company1_timestamp.jpg
    ├── company2_timestamp.jpg
    └── ...
```

## Database Integration

The `aadhaar_document_path` and `gst_certificate_path` fields in the database now store Cloudinary URLs instead of local file paths:

```sql
-- Example usage
SELECT name, gstin, gst_certificate_path FROM sellers
WHERE gst_certificate_path LIKE 'https://res.cloudinary.com%'
```

## Free Tier Limits

Cloudinary's free tier includes:
- **15 GB Storage**
- **20 Million Transformations/month**
- **Bandwidth**: 1 GB/month
- **5 Admin API Requests/hour**

This should be sufficient for development and small-scale projects. Upgrade to a paid plan as needed.

## Security Best Practices

1. **Never hardcode credentials** - Always use environment variables
2. **Keep API Secret confidential** - Don't share or expose in public repositories
3. **Use secure URLs** - Always use `https://` URLs returned by Cloudinary
4. **Validate file uploads** - Verify file size and type on both client and server
5. **Set up resource policies** - Use Cloudinary's Upload Presets for additional control

## Troubleshooting

### "Missing CLOUDINARY_API_SECRET"
- Check that your environment variables are properly set in `.env`
- Restart the development server after adding environment variables
- Reload the page to ensure new variables are picked up

### "Upload failed: Authentication error"
- Verify your API Key and API Secret are correct
- Check that they're properly set in `.env`
- Ensure your Cloudinary account is active

### "File too large"
- Default limit is 2MB
- Modify the limit in `app/api/upload/document/route.ts` if needed

### Images not displaying
- Check that the URL is correct
- Ensure the file hasn't been deleted from Cloudinary
- Verify the file format is supported

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Image Optimization Guide](https://cloudinary.com/documentation/image_optimization)
- [Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)

## Migrating from Local Storage

If you have existing files stored locally, you can migrate them to Cloudinary:

1. Use the Cloudinary Upload API to upload existing files
2. Update the database URLs to point to Cloudinary
3. Remove the local `data/uploads/` directory

Example migration script:
```typescript
import { uploadToCloudinary } from "@/lib/cloudinary"
import { readFileSync } from "fs"

// For each existing file:
const buffer = readFileSync("data/uploads/aadhaar/user_123456789.jpg")
const result = await uploadToCloudinary(buffer, "user_123456789.jpg", "aadhaar")
// Update database with result.secure_url
```
