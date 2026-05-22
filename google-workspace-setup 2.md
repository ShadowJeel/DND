# Google Workspace SMTP Setup Guide

This guide covers how to set up Google Workspace (Gmail) for sending emails in the DND application using Nodemailer. 

Since you already have a Google Workspace account and domain configured, you just need to generate an App Password to authenticate the SMTP service securely.

## Step 1: Enable 2-Step Verification
App Passwords require 2-Step Verification to be enabled on your Google Workspace account.
1. Go to your Google Account management page: [https://myaccount.google.com/](https://myaccount.google.com/)
2. Navigate to the **Security** tab on the left panel.
3. Under "How you sign in to Google," select **2-Step Verification**.
4. Follow the on-screen steps to enable it if it's not already turned on.

## Step 2: Generate an App Password
1. In the **Security** tab, use the search bar at the top and search for **App passwords** (or look under 2-Step Verification settings).
2. You may be prompted to sign in again.
3. In the "Select app" dropdown, choose **Mail** (or "Other (Custom name)" and enter `DND App`).
4. In the "Select device" dropdown, choose your device (or "Other" and enter `Server`).
5. Click **Generate**.
6. A modal will appear with a 16-character password (e.g., `abcd efgh ijkl mnop`). **Copy this password**; you won't be able to see it again.

## Step 3: Configure Environment Variables
Update your project's `.env` or `.env.local` file with the Google Workspace credentials.

```env
# Email Configuration
EMAIL_TEST_MODE="false"
SMTP_USER="your-email@yourdomain.com"
SMTP_PASS="your-16-character-app-password"
EMAIL_FROM_ADDRESS="your-email@yourdomain.com"
```

> [!WARNING]
> Do not include spaces when pasting your App Password in the `.env` file. It should be 16 characters long.

## Step 4: Verify the Setup
The `lib/email.ts` file has already been updated to use `nodemailer` with these environment variables. When the application triggers an email (e.g., a Welcome Email or an Offer Accepted notification), it will securely connect to `smtp.gmail.com` on port 465 using the provided credentials.
